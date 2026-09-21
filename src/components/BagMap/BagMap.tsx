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

import { Search, Loader2 } from "lucide-react";

import { useEffect, useRef, useState } from "react";

import type {
  Feature,
  FeatureCollection,
  Geometry,
  GeoJsonObject,
  MultiPolygon,
  Polygon as GeoPolygon,
} from "geojson";
import enschedeJson from "@/assets/shapefile/enschede/enschede.json";

const raw = enschedeJson as unknown as GeoJsonObject;

// Flatten any GeoJSON shape into a plain list of geometries
const collectGeometries = (obj: GeoJsonObject): Geometry[] => {
  switch (obj.type) {
    case "FeatureCollection":
      return (obj as FeatureCollection).features.flatMap((f) =>
        f.geometry ? collectGeometries(f.geometry) : [],
      );
    case "Feature": {
      const g = (obj as Feature).geometry;
      return g ? collectGeometries(g) : [];
    }
    case "GeometryCollection":
      return (obj as unknown as { geometries: Geometry[] }).geometries.flatMap(
        collectGeometries,
      );
    default:
      return [obj as Geometry];
  }
};

const polygons = collectGeometries(raw).filter(
  (g): g is GeoPolygon | MultiPolygon =>
    g.type === "Polygon" || g.type === "MultiPolygon",
);

if (polygons.length === 0) {
  throw new Error(
    `enschede.json has no Polygon/MultiPolygon geometry (top-level type: "${raw.type}").`,
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

// ---- Boundary geometry ---------------------------------------------------
// Every ring (outer + holes) of every polygon, as [lat, lng]
const RINGS: L.LatLngTuple[][] = [];
for (const f of enschede.features) {
  const g = f.geometry;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const poly of polys)
    for (const ring of poly)
      RINGS.push(ring.map(([lng, lat]) => [lat, lng] as L.LatLngTuple));
}

const ENSCHEDE_BOUNDS = L.geoJSON(enschede).getBounds();
const MAX_BOUNDS = ENSCHEDE_BOUNDS.pad(0.1);
const TILE_BOUNDS = ENSCHEDE_BOUNDS.pad(0.02); // only fetch tiles around the city

// "World minus Enschede": a big outer ring plus the boundary rings, filled
// with the even-odd rule (Leaflet's default), so the city itself is a hole
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

// Even-odd point-in-polygon across all rings (handles holes/enclaves)
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

// {y}/{x} = tileRow/tileCol in OGC API Tiles
const BAG_URL =
  "https://api.pdok.nl/kadaster/bag/ogc/v2/tiles/WebMercatorQuad/{z}/{y}/{x}?f=mvt";

const BAG_FEATURES_URL =
  "https://api.pdok.nl/kadaster/bag/ogc/v2/collections/pand/items";

// ---- BAG layer -----------------------------------------------------------
interface BagProps {
  identificatie: string;
  bouwjaar?: number;
  status?: string;
  gebruiksdoel?: string;
  aantal_verblijfsobjecten?: number;
}

type VgEvent = L.LeafletMouseEvent & { layer: { properties: BagProps } };

interface VectorGridLayer extends L.GridLayer {
  setFeatureStyle(id: string, style: L.PathOptions): void;
  resetFeatureStyle(id: string): void;
}

interface BagSearchFeature {
  type: "Feature";
  id?: string;
  properties: BagProps;
  geometry: GeoPolygon | MultiPolygon;
}

interface BagSearchResponse {
  type: "FeatureCollection";
  features: BagSearchFeature[];
}

// leaflet.vectorgrid attaches itself to L at runtime but ships no types
const LL = L as unknown as {
  vectorGrid: { protobuf(url: string, options: object): VectorGridLayer };
  canvas: { tile: unknown };
};

// Lets us write handlers with a typed event instead of `any`
const handler = (fn: (e: VgEvent) => void) =>
  fn as unknown as L.LeafletEventHandlerFn;

const colorByYear = (y?: number) =>
  !y
    ? "#9ca3af"
    : y < 1900
      ? "#7f1d1d"
      : y < 1945
        ? "#c2410c"
        : y < 1975
          ? "#d97706"
          : y < 2000
            ? "#65a30d"
            : "#0284c7";

const pandStyle = (p: BagProps) => ({
  fill: true,
  fillColor: colorByYear(p.bouwjaar),
  fillOpacity: 0.6,
  color: "#1f2937",
  weight: 0.6,
});

// Draw only `pand`; any other layer in the tile gets an empty style, so it's skipped
const layerStyles = new Proxy({ pand: pandStyle } as Record<string, unknown>, {
  get: (target, name) =>
    typeof name === "string" && name in target ? target[name] : [],
});

interface BagSearchProps {
  vectorLayerRef: React.MutableRefObject<VectorGridLayer | null>;
}

const BagSearch = ({ vectorLayerRef }: BagSearchProps) => {
  const map = useMap();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BagSearchFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const highlightRef = useRef<L.GeoJSON | null>(null);
  const previousFeatureId = useRef<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);

        const bounds = ENSCHEDE_BOUNDS;

        const bbox = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ].join(",");

        /*
         * Search BAG identification.
         *
         * Example:
         *     015310...
         */
        const filter = `identificatie LIKE '${query.trim().replace(/'/g, "''")}%'`;

        const params = new URLSearchParams({
          f: "json",
          limit: "10",
          bbox,
          filter,
        });

        const response = await fetch(
          `${BAG_FEATURES_URL}?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`BAG search failed: ${response.status}`);
        }

        const data = (await response.json()) as BagSearchResponse;

        setResults(data.features ?? []);
        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("BAG search error:", error);
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  const selectFeature = (feature: BagSearchFeature) => {
    const id = feature.properties.identificatie;

    setQuery(id);
    setResults([]);
    setOpen(false);

    // Reset previous vector-grid highlight
    if (previousFeatureId.current) {
      vectorLayerRef.current?.resetFeatureStyle(previousFeatureId.current);
    }

    previousFeatureId.current = id;

    // Highlight VectorGrid feature
    vectorLayerRef.current?.setFeatureStyle(id, {
      fill: true,
      fillColor: "#facc15",
      fillOpacity: 0.9,
      color: "#ef4444",
      weight: 3,
    });

    // Remove previous GeoJSON highlight
    if (highlightRef.current) {
      map.removeLayer(highlightRef.current);
    }

    // Create exact highlight using returned geometry
    const highlight = L.geoJSON(feature as Feature, {
      style: {
        color: "#ef4444",
        weight: 4,
        fillColor: "#facc15",
        fillOpacity: 0.35,
      },
      interactive: false,
    });

    highlight.addTo(map);

    highlightRef.current = highlight;

    const bounds = highlight.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [80, 80],
        maxZoom: 19,
      });
    }
  };

  return (
    <div
      className="absolute left-1/2 top-4 z-[1000] w-[420px] -translate-x-1/2"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <Command
        shouldFilter={false}
        className="overflow-visible rounded-xl border bg-background shadow-lg"
      >
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />

          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (results.length > 0) {
                setOpen(true);
              }
            }}
            placeholder="Search BAG polygon ID..."
            className="h-11 border-0 pl-9 pr-10 shadow-none focus-visible:ring-0"
          />

          {loading && (
            <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {open && query.length >= 2 && (
          <CommandList className="absolute top-[calc(100%+6px)] z-[1100] w-full rounded-xl border bg-background shadow-xl">
            {!loading && results.length === 0 && (
              <CommandEmpty>No buildings found.</CommandEmpty>
            )}

            <CommandGroup heading="Buildings">
              {results.map((feature) => {
                const p = feature.properties;

                return (
                  <CommandItem
                    key={feature.id ?? p.identificatie}
                    value={p.identificatie}
                    onSelect={() => selectFeature(feature)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        Pand {p.identificatie}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        Built {p.bouwjaar ?? "unknown"}
                        {p.gebruiksdoel ? ` · ${p.gebruiksdoel}` : ""}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
    </div>
  );
};

interface BagLayerProps {
  layerRef: React.MutableRefObject<VectorGridLayer | null>;
}

const BagLayer = ({ layerRef }: BagLayerProps) => {
  const map = useMap();

  useEffect(() => {
    let layer: VectorGridLayer | undefined;
    let cancelled = false;

    (async () => {
      // leaflet.vectorgrid expects a global L, so set it before importing
      Object.assign(window, { L });

      // Compatibility patch for leaflet.vectorgrid + Leaflet >= 1.8
      const DomEvent = L.DomEvent as typeof L.DomEvent & {
        fakeStop?: (e: Event) => boolean;
      };

      if (!DomEvent.fakeStop) {
        DomEvent.fakeStop = () => true;
      }

      await import("leaflet.vectorgrid");
      if (cancelled) return;

      layer = LL.vectorGrid.protobuf(BAG_URL, {
        rendererFactory: LL.canvas.tile,
        interactive: true,
        bounds: TILE_BOUNDS,

        minNativeZoom: 17,
        maxNativeZoom: 17,

        getFeatureId: (f: { properties: BagProps }) =>
          f.properties.identificatie,

        vectorTileLayerStyles: layerStyles,
      });

      layerRef.current = layer;

      layer.on(
        "mouseover",
        handler((e) => {
          if (!insideEnschede(e.latlng.lat, e.latlng.lng)) return;
          layer?.setFeatureStyle(e.layer.properties.identificatie, {
            fill: true,
            fillColor: "#facc15",
            fillOpacity: 0.9,
            color: "#111",
            weight: 1.5,
          });
        }),
      );

      layer.on(
        "mouseout",
        handler((e) =>
          layer?.resetFeatureStyle(e.layer.properties.identificatie),
        ),
      );
      layer.on(
        "click",
        handler((e) => {
          if (!insideEnschede(e.latlng.lat, e.latlng.lng)) return;
          const p = e.layer.properties;
          L.popup()
            .setLatLng(e.latlng)
            .setContent(
              `<b>Pand ${p.identificatie}</b><br/>
               Built: ${p.bouwjaar ?? "n/a"}<br/>
               Status: ${p.status ?? "n/a"}<br/>
               Use: ${p.gebruiksdoel ?? "n/a"}<br/>
               Units: ${p.aantal_verblijfsobjecten ?? "n/a"}`,
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
  }, [map]);

  return null;
};

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
