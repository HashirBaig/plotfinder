"use client";

import {
  GeoJSON,
  MapContainer,
  Polygon,
  TileLayer,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { Input } from "@/components/ui/input";

import { Loader2, Search } from "lucide-react";

import { useEffect, useRef, useState } from "react";

import type { MutableRefObject } from "react";

import type {
  Feature,
  FeatureCollection,
  Geometry,
  GeoJsonObject,
  MultiPolygon,
  Polygon as GeoPolygon,
} from "geojson";

import enschedeJson from "@/assets/shapefile/enschede/enschede.json";

// -----------------------------------------------------------------------------
// Enschede boundary
// -----------------------------------------------------------------------------

const raw = enschedeJson as unknown as GeoJsonObject;

const collectGeometries = (obj: GeoJsonObject): Geometry[] => {
  switch (obj.type) {
    case "FeatureCollection":
      return (obj as FeatureCollection).features.flatMap((feature) =>
        feature.geometry ? collectGeometries(feature.geometry) : [],
      );

    case "Feature": {
      const geometry = (obj as Feature).geometry;

      return geometry ? collectGeometries(geometry) : [];
    }

    case "GeometryCollection":
      return (
        obj as unknown as {
          geometries: Geometry[];
        }
      ).geometries.flatMap(collectGeometries);

    default:
      return [obj as Geometry];
  }
};

const polygons = collectGeometries(raw).filter(
  (geometry): geometry is GeoPolygon | MultiPolygon =>
    geometry.type === "Polygon" || geometry.type === "MultiPolygon",
);

if (polygons.length === 0) {
  throw new Error(
    `enschede.json has no Polygon/MultiPolygon geometry. Top-level type: "${raw.type}".`,
  );
}

const enschede: FeatureCollection<GeoPolygon | MultiPolygon> = {
  type: "FeatureCollection",

  features: polygons.map((geometry) => ({
    type: "Feature",
    properties: {},
    geometry,
  })),
};

// -----------------------------------------------------------------------------
// Boundary rings
// -----------------------------------------------------------------------------

const RINGS: L.LatLngTuple[][] = [];

for (const feature of enschede.features) {
  const geometry = feature.geometry;

  const polygonGroups =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  for (const polygon of polygonGroups) {
    for (const ring of polygon) {
      RINGS.push(ring.map(([lng, lat]) => [lat, lng] as L.LatLngTuple));
    }
  }
}

const ENSCHEDE_BOUNDS = L.geoJSON(enschede).getBounds();

const MAX_BOUNDS = ENSCHEDE_BOUNDS.pad(0.1);

const TILE_BOUNDS = ENSCHEDE_BOUNDS.pad(0.02);

const outer = MAX_BOUNDS.pad(5);

const MASK: L.LatLngTuple[][] = [
  [
    [outer.getSouth(), outer.getWest()],
    [outer.getNorth(), outer.getWest()],
    [outer.getNorth(), outer.getEast()],
    [outer.getSouth(), outer.getEast()],
  ],

  ...RINGS,
];

// -----------------------------------------------------------------------------
// Point-in-polygon check
// -----------------------------------------------------------------------------

const insideEnschede = (lat: number, lng: number) => {
  let inside = false;

  for (const ring of RINGS) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [yi, xi] = ring[i];
      const [yj, xj] = ring[j];

      if (
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
  }

  return inside;
};

const CENTER: [number, number] = [52.2215, 6.8937];

// -----------------------------------------------------------------------------
// PDOK endpoints
// -----------------------------------------------------------------------------

const BAG_TILE_URL =
  "https://api.pdok.nl/kadaster/bag/ogc/v2/tiles/WebMercatorQuad/{z}/{y}/{x}?f=mvt";

const LOCATION_SEARCH_URL =
  "https://api.pdok.nl/kadaster/location-api/v1/search";

const BAG_PAND_URL =
  "https://api.pdok.nl/kadaster/bag/ogc/v2/collections/pand/items";

// -----------------------------------------------------------------------------
// BAG Types
// -----------------------------------------------------------------------------

interface BagProps {
  identificatie: string;

  bouwjaar?: number;

  status?: string;

  gebruiksdoel?: string;

  aantal_verblijfsobjecten?: number;
}

interface PandFeature {
  type: "Feature";

  id?: string;

  properties: BagProps;

  geometry: GeoPolygon | MultiPolygon;
}

interface FeatureCollectionResponse<T> {
  type: "FeatureCollection";

  features: T[];
}

// -----------------------------------------------------------------------------
// Location API result
// -----------------------------------------------------------------------------

interface LocationSearchFeature {
  type: "Feature";

  id: string;

  geometry?: {
    type: "Point";

    coordinates: [number, number];
  };

  properties: {
    display_name: string;

    collection_id?: string;

    collection_version?: number;

    score?: number;
  };
}

interface LocationSearchResponse {
  type: "FeatureCollection";

  features: LocationSearchFeature[];
}

// -----------------------------------------------------------------------------
// VectorGrid types
// -----------------------------------------------------------------------------

type VgEvent = L.LeafletMouseEvent & {
  layer: {
    properties: BagProps;
  };
};

interface VectorGridLayer extends L.GridLayer {
  setFeatureStyle(id: string, style: L.PathOptions): void;

  resetFeatureStyle(id: string): void;
}

const LL = L as unknown as {
  vectorGrid: {
    protobuf(url: string, options: object): VectorGridLayer;
  };

  canvas: {
    tile: unknown;
  };
};

const handler = (fn: (event: VgEvent) => void) =>
  fn as unknown as L.LeafletEventHandlerFn;

// -----------------------------------------------------------------------------
// Building styles
// -----------------------------------------------------------------------------

const colorByYear = (year?: number) =>
  !year
    ? "#9ca3af"
    : year < 1900
      ? "#7f1d1d"
      : year < 1945
        ? "#c2410c"
        : year < 1975
          ? "#d97706"
          : year < 2000
            ? "#65a30d"
            : "#0284c7";

const pandStyle = (properties: BagProps) => ({
  fill: true,

  fillColor: colorByYear(properties.bouwjaar),

  fillOpacity: 0.6,

  color: "#1f2937",

  weight: 0.6,
});

const layerStyles = new Proxy(
  {
    pand: pandStyle,
  } as Record<string, unknown>,

  {
    get: (target, name) =>
      typeof name === "string" && name in target ? target[name] : [],
  },
);

// -----------------------------------------------------------------------------
// Search component
// -----------------------------------------------------------------------------

interface BagSearchProps {
  vectorLayerRef: MutableRefObject<VectorGridLayer | null>;
}

const BagSearch = ({ vectorLayerRef }: BagSearchProps) => {
  const map = useMap();

  const [query, setQuery] = useState("");

  const [results, setResults] = useState<LocationSearchFeature[]>([]);

  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);

  const highlightRef = useRef<L.GeoJSON | null>(null);

  const previousFeatureId = useRef<string | null>(null);

  const skipNextSearch = useRef(false);

  // ---------------------------------------------------------------------------
  // Search addresses
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;

      return;
    }

    const value = query.trim();

    if (value.length < 2) {
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams();

        params.set("q", `${value} Enschede`);

        // IMPORTANT:
        // restrict Location API
        // specifically to addresses.
        params.set("adres[version]", "1");

        params.set("limit", "10");

        params.set("f", "json");

        const response = await fetch(
          `${LOCATION_SEARCH_URL}?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Location API failed with ${response.status}`);
        }

        const data = (await response.json()) as LocationSearchResponse;

        const filtered = (data.features ?? [])
          .filter((feature) => {
            const name = feature.properties.display_name?.toLowerCase();

            return name && name.includes("enschede");
          })
          .slice(0, 10);

        setResults(filtered);

        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("PDOK address search failed:", error);

          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();

      window.clearTimeout(timeout);
    };
  }, [query]);

  const pointInsideRing = (lng: number, lat: number, ring: number[][]) => {
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];

      const intersects =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersects) {
        inside = !inside;
      }
    }

    return inside;
  };

  const pointInsidePolygon = (
    lng: number,
    lat: number,
    geometry: GeoPolygon | MultiPolygon,
  ) => {
    const polygons =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.coordinates;

    for (const polygon of polygons) {
      const outerRing = polygon[0];

      if (!pointInsideRing(lng, lat, outerRing)) {
        continue;
      }

      // Make sure point isn't inside a hole
      let insideHole = false;

      for (let i = 1; i < polygon.length; i++) {
        if (pointInsideRing(lng, lat, polygon[i])) {
          insideHole = true;
          break;
        }
      }

      if (!insideHole) {
        return true;
      }
    }

    return false;
  };

  const findPandAtLocation = async (lng: number, lat: number) => {
    /*
     * Roughly a small area around the selected address.
     *
     * ~0.00015 degrees is around 10–20 metres at this latitude.
     */
    const delta = 0.0002;

    const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(",");

    const params = new URLSearchParams({
      f: "json",
      bbox,
      limit: "50",
    });

    const response = await fetch(`${BAG_PAND_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Pand search failed: ${response.status}`);
    }

    const data =
      (await response.json()) as FeatureCollectionResponse<PandFeature>;

    const buildings = data.features ?? [];

    console.log("Nearby BAG buildings:", buildings);

    /*
     * Prefer the actual building containing
     * the address point.
     */
    const containingBuilding = buildings.find((building) =>
      pointInsidePolygon(lng, lat, building.geometry),
    );

    if (containingBuilding) {
      return containingBuilding;
    }

    /*
     * Fallback:
     * return nearest candidate if the address point happens
     * to sit just outside the polygon.
     */
    if (buildings.length > 0) {
      let closest: PandFeature | undefined;

      let closestDistance = Infinity;

      for (const building of buildings) {
        const layer = L.geoJSON(building as Feature);

        const center = layer.getBounds().getCenter();

        const distance = map.distance([lat, lng], center);

        if (distance < closestDistance) {
          closestDistance = distance;

          closest = building;
        }
      }

      return closest;
    }

    return undefined;
  };

  // ---------------------------------------------------------------------------
  // Select result
  // ---------------------------------------------------------------------------

  const selectAddress = async (address: LocationSearchFeature) => {
    const label = address.properties.display_name;

    setQuery(label);
    setOpen(false);
    setResults([]);

    skipNextSearch.current = true;

    try {
      setLoading(true);

      const geometry = address.geometry;

      if (!geometry || geometry.type !== "Point") {
        throw new Error("Selected address has no point geometry.");
      }

      const [lng, lat] = geometry.coordinates;

      console.log("Selected address:", label, lat, lng);

      /*
       * Immediately zoom to the address.
       *
       * Even if the BAG polygon lookup subsequently fails,
       * the user still sees where the address is.
       */
      map.flyTo([lat, lng], 19, {
        animate: true,
        duration: 0.7,
      });

      /*
       * Find BAG building at selected address.
       */
      const feature = await findPandAtLocation(lng, lat);

      if (!feature) {
        throw new Error(`No BAG building found near ${label}.`);
      }

      const pandId = feature.properties.identificatie;

      console.log("Found BAG pand:", pandId, feature);

      /*
       * Reset previous VectorGrid highlight
       */
      if (previousFeatureId.current) {
        vectorLayerRef.current?.resetFeatureStyle(previousFeatureId.current);
      }

      previousFeatureId.current = pandId;

      /*
       * Highlight VectorGrid polygon
       */
      vectorLayerRef.current?.setFeatureStyle(pandId, {
        fill: true,
        fillColor: "#facc15",
        fillOpacity: 0.9,
        color: "#ef4444",
        weight: 3,
      });

      /*
       * Remove previous exact GeoJSON highlight
       */
      if (highlightRef.current) {
        map.removeLayer(highlightRef.current);
      }

      /*
       * Add selected polygon as separate
       * GeoJSON layer.
       *
       * This guarantees that we see the highlight
       * even if the VectorGrid tile hasn't loaded yet.
       */
      const highlight = L.geoJSON(
        feature as Feature<GeoPolygon | MultiPolygon, BagProps>,
        {
          style: {
            color: "#ef4444",
            weight: 4,

            fill: true,
            fillColor: "#facc15",
            fillOpacity: 0.45,
          },

          interactive: false,
        },
      );

      highlight.addTo(map);

      /*
       * Bring highlight above other Leaflet layers.
       */
      highlight.bringToFront();

      highlightRef.current = highlight;

      /*
       * Zoom precisely to the building.
       */
      const bounds = highlight.getBounds();

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [120, 120],

          maxZoom: 19,

          animate: true,

          duration: 0.7,
        });
      }
    } catch (error) {
      console.error("Could not locate selected building:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Cleanup highlight
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (highlightRef.current) {
        map.removeLayer(highlightRef.current);
      }
    };
  }, [map]);

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div
      className="
        absolute
        left-1/2
        top-4
        z-[1000]
        w-[min(430px,calc(100%-32px))]
        -translate-x-1/2
      "
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <Command
        shouldFilter={false}
        className="
          overflow-visible
          rounded-xl
          border
          bg-background
          shadow-lg
        "
      >
        <div
          className="
            relative
            flex
            items-center
          "
        >
          <Search
            className="
              pointer-events-none
              absolute
              left-3
              h-4
              w-4
              text-muted-foreground
            "
          />

          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);

              setOpen(true);
            }}
            onFocus={() => {
              if (results.length > 0) {
                setOpen(true);
              }
            }}
            placeholder="Search address in Enschede..."
            autoComplete="off"
            className="
              h-12
              border-0
              pl-10
              pr-10
              shadow-none
              focus-visible:ring-0
            "
          />

          {loading && (
            <Loader2
              className="
                pointer-events-none
                absolute
                right-3
                h-4
                w-4
                animate-spin
                text-muted-foreground
              "
            />
          )}
        </div>

        {open && query.trim().length >= 2 && (
          <CommandList
            className="
                absolute
                top-[calc(100%+8px)]
                z-[1100]
                max-h-[320px]
                w-full
                rounded-xl
                border
                bg-background
                p-1
                shadow-xl
              "
          >
            {!loading && results.length === 0 && (
              <CommandEmpty>No addresses found in Enschede.</CommandEmpty>
            )}

            <CommandGroup heading="Addresses">
              {results.map((feature) => (
                <CommandItem
                  key={feature.id}
                  value={feature.properties.display_name}
                  onSelect={() => selectAddress(feature)}
                  className="
                        cursor-pointer
                        rounded-lg
                        px-3
                        py-3
                      "
                >
                  <div
                    className="
                          flex
                          flex-col
                          gap-0.5
                        "
                  >
                    <span
                      className="
                            font-medium
                          "
                    >
                      {feature.properties.display_name}
                    </span>

                    <span
                      className="
                            text-xs
                            text-muted-foreground
                          "
                    >
                      BAG address
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
    </div>
  );
};

// -----------------------------------------------------------------------------
// BAG vector layer
// -----------------------------------------------------------------------------

interface BagLayerProps {
  layerRef: MutableRefObject<VectorGridLayer | null>;
}

const BagLayer = ({ layerRef }: BagLayerProps) => {
  const map = useMap();

  useEffect(() => {
    let layer: VectorGridLayer | undefined;

    let cancelled = false;

    (async () => {
      Object.assign(window, {
        L,
      });

      // Compatibility patch:
      // leaflet.vectorgrid + modern Leaflet
      const DomEvent = L.DomEvent as typeof L.DomEvent & {
        fakeStop?: (event: Event) => boolean;

        _fakeStop?: (event: Event) => boolean;
      };

      if (!DomEvent.fakeStop) {
        DomEvent.fakeStop = () => true;
      }

      if (!DomEvent._fakeStop) {
        DomEvent._fakeStop = () => true;
      }

      await import("leaflet.vectorgrid");

      if (cancelled) {
        return;
      }

      layer = LL.vectorGrid.protobuf(BAG_TILE_URL, {
        rendererFactory: LL.canvas.tile,

        interactive: true,

        bounds: TILE_BOUNDS,

        minNativeZoom: 17,

        maxNativeZoom: 17,

        getFeatureId: (feature: { properties: BagProps }) =>
          feature.properties.identificatie,

        vectorTileLayerStyles: layerStyles,
      });

      layerRef.current = layer;

      layer.on(
        "mouseover",

        handler((event) => {
          if (!insideEnschede(event.latlng.lat, event.latlng.lng)) {
            return;
          }

          layer?.setFeatureStyle(
            event.layer.properties.identificatie,

            {
              fill: true,

              fillColor: "#facc15",

              fillOpacity: 0.9,

              color: "#111",

              weight: 1.5,
            },
          );
        }),
      );

      layer.on(
        "mouseout",

        handler((event) => {
          layer?.resetFeatureStyle(event.layer.properties.identificatie);
        }),
      );

      layer.on(
        "click",

        handler((event) => {
          if (!insideEnschede(event.latlng.lat, event.latlng.lng)) {
            return;
          }

          const properties = event.layer.properties;

          L.popup()
            .setLatLng(event.latlng)
            .setContent(
              `
                  <b>Pand ${properties.identificatie}</b>
                  <br />
                  Built: ${properties.bouwjaar ?? "n/a"}
                  <br />
                  Status: ${properties.status ?? "n/a"}
                  <br />
                  Use: ${properties.gebruiksdoel ?? "n/a"}
                  <br />
                  Units: ${properties.aantal_verblijfsobjecten ?? "n/a"}
                `,
            )
            .openOn(map);
        }),
      );

      layer.addTo(map);
    })();

    return () => {
      cancelled = true;

      if (layer) {
        map.removeLayer(layer);
      }

      layerRef.current = null;
    };
  }, [map, layerRef]);

  return null;
};

// -----------------------------------------------------------------------------
// Main map
// -----------------------------------------------------------------------------

function BagMap() {
  const vectorLayerRef = useRef<VectorGridLayer | null>(null);

  return (
    <MapContainer
      center={CENTER}
      zoom={17}
      minZoom={16}
      maxZoom={19}
      maxBounds={MAX_BOUNDS}
      style={{
        height: "100vh",

        width: "100%",

        position: "relative",
      }}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        attribution="&copy; OpenStreetMap contributors | BAG &copy; Kadaster (PDOK)"
      />

      <BagLayer layerRef={vectorLayerRef} />

      <Polygon
        positions={MASK}
        interactive={false}
        pathOptions={{
          stroke: false,

          fillColor: "#f3f4f6",

          fillOpacity: 1,
        }}
      />

      <GeoJSON
        data={enschede}
        interactive={false}
        style={{
          color: "#374151",

          weight: 5,

          fillColor: "#808080",

          fillOpacity: 0.05,
        }}
      />

      <BagSearch vectorLayerRef={vectorLayerRef} />
    </MapContainer>
  );
}

export default BagMap;
