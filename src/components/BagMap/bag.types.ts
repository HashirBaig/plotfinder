import L from "leaflet";

import type { MultiPolygon, Polygon as GeoPolygon } from "geojson";

export interface BagProps {
  identificatie: string;
  bouwjaar?: number;
  status?: string;
  gebruiksdoel?: string;
  aantal_verblijfsobjecten?: number;
}

export interface PandFeature {
  type: "Feature";
  id?: string;
  properties: BagProps;
  geometry: GeoPolygon | MultiPolygon;
}

export interface FeatureCollectionResponse<T> {
  type: "FeatureCollection";
  features: T[];
}

export interface LocationSearchFeature {
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

export interface LocationSearchResponse {
  type: "FeatureCollection";
  features: LocationSearchFeature[];
}

export type VgEvent = L.LeafletMouseEvent & {
  layer: {
    properties: BagProps;
  };
};

export interface VectorGridLayer extends L.GridLayer {
  setFeatureStyle(id: string, style: L.PathOptions): void;

  resetFeatureStyle(id: string): void;
}
