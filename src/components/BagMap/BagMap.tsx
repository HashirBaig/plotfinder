"use client";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

const CENTER: [number, number] = [52.2215, 6.8937];
// Rough Enschede bounds; tighten later with the municipality polygon
const BOUNDS: L.LatLngBoundsExpression = [
  [52.12, 6.72],
  [52.33, 7.05],
];

// {y}/{x} = tileRow/tileCol in OGC API Tiles
const BAG_URL =
  "https://api.pdok.nl/kadaster/bag/ogc/v2/tiles/WebMercatorQuad/{z}/{y}/{x}?f=mvt";

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
      await import("leaflet.vectorgrid");
      if (cancelled) return;

      layer = LL.vectorGrid.protobuf(BAG_URL, {
        rendererFactory: LL.canvas.tile,
        interactive: true,
        minNativeZoom: 17,
        maxNativeZoom: 17,
        getFeatureId: (f: { properties: BagProps }) =>
          f.properties.identificatie,
        vectorTileLayerStyles: layerStyles,
      });

      layer.on(
        "mouseover",
        handler((e) =>
          layer?.setFeatureStyle(e.layer.properties.identificatie, {
            fill: true,
            fillColor: "#facc15",
            fillOpacity: 0.9,
            color: "#111",
            weight: 1.5,
          }),
        ),
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
      maxBounds={BOUNDS}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        attribution="&copy; OpenStreetMap contributors | BAG &copy; Kadaster (PDOK)"
      />
      <BagLayer />
    </MapContainer>
  );
}

export default BagMap;
