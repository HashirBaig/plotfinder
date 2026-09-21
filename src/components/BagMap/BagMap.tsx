"use client";

import { useRef } from "react";

import { GeoJSON, MapContainer, Polygon, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import BagLayer from "./BagLayer";
import BagSearch from "./BagSearch";

import { CENTER } from "./bag.constants";

import { enschede, MASK, MAX_BOUNDS } from "./bag.geometry";

import type { VectorGridLayer } from "./bag.types";

export default function BagMap() {
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
