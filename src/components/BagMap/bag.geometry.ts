import L from "leaflet";

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
  throw new Error("Enschede boundary contains no polygons.");
}

export const enschede: FeatureCollection<GeoPolygon | MultiPolygon> = {
  type: "FeatureCollection",

  features: polygons.map((geometry) => ({
    type: "Feature",
    properties: {},
    geometry,
  })),
};

// ----------------------------------------------------
// Boundary rings
// ----------------------------------------------------

export const RINGS: L.LatLngTuple[][] = [];

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

export const ENSCHEDE_BOUNDS = L.geoJSON(enschede).getBounds();

export const MAX_BOUNDS = ENSCHEDE_BOUNDS.pad(0.1);

export const TILE_BOUNDS = ENSCHEDE_BOUNDS.pad(0.02);

const outer = MAX_BOUNDS.pad(5);

export const MASK: L.LatLngTuple[][] = [
  [
    [outer.getSouth(), outer.getWest()],
    [outer.getNorth(), outer.getWest()],
    [outer.getNorth(), outer.getEast()],
    [outer.getSouth(), outer.getEast()],
  ],

  ...RINGS,
];

// ----------------------------------------------------
// Enschede containment
// ----------------------------------------------------

export const insideEnschede = (lat: number, lng: number) => {
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

// ----------------------------------------------------
// Polygon containment
// ----------------------------------------------------

export const pointInsideRing = (lng: number, lat: number, ring: number[][]) => {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

export const pointInsidePolygon = (
  lng: number,
  lat: number,
  geometry: GeoPolygon | MultiPolygon,
) => {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  for (const polygon of polygons) {
    if (!pointInsideRing(lng, lat, polygon[0])) {
      continue;
    }

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
