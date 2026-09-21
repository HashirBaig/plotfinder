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

import { useEffect } from "react";

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

const BagLayer = () => {
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
        // PDOK only serves zoom 17 for WebMercatorQuad
        minNativeZoom: 17,
        maxNativeZoom: 17,
        getFeatureId: (f: { properties: BagProps }) =>
          f.properties.identificatie,
        vectorTileLayerStyles: layerStyles,
      });

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
      if (layer) map.removeLayer(layer);
    };
  }, [map]);

  return null;
};

function BagMap() {
  return (
    <MapContainer
      center={CENTER}
      zoom={17}
      minZoom={16}
      maxZoom={19}
      maxBounds={MAX_BOUNDS}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        attribution="&copy; OpenStreetMap contributors | BAG &copy; Kadaster (PDOK)"
      />
      <BagLayer />

      {/* Hides everything outside Enschede (order matters: mask, then outline) */}
      <Polygon
        positions={MASK}
        interactive={false}
        pathOptions={{ stroke: false, fillColor: "#f3f4f6", fillOpacity: 1 }}
      />

      {/* Boundary: 5px outline, gray fill at 5% opacity */}
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
    </MapContainer>
  );
}

export default BagMap;
