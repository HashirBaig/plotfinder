"use client";

import { useEffect } from "react";

import type { MutableRefObject } from "react";

import { useMap } from "react-leaflet";

import L from "leaflet";

import { BAG_TILE_URL } from "./bag.constants";

import { insideEnschede, TILE_BOUNDS } from "./bag.geometry";

import { layerStyles } from "./bag.styles";

import type { BagProps, VectorGridLayer, VgEvent } from "./bag.types";

interface BagLayerProps {
  layerRef: MutableRefObject<VectorGridLayer | null>;
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

export default function BagLayer({ layerRef }: BagLayerProps) {
  const map = useMap();

  useEffect(() => {
    let layer: VectorGridLayer | undefined;

    let cancelled = false;

    (async () => {
      Object.assign(window, {
        L,
      });

      const DomEvent = L.DomEvent as typeof L.DomEvent & {
        fakeStop?: (event: Event) => boolean;

        _fakeStop?: (event: Event) => boolean;
      };

      DomEvent.fakeStop ??= () => true;

      DomEvent._fakeStop ??= () => true;

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

          const p = event.layer.properties;

          L.popup()
            .setLatLng(event.latlng)
            .setContent(
              `
                <b>Pand ${p.identificatie}</b><br/>
                Built: ${p.bouwjaar ?? "n/a"}<br/>
                Status: ${p.status ?? "n/a"}<br/>
                Use: ${p.gebruiksdoel ?? "n/a"}<br/>
                Units: ${p.aantal_verblijfsobjecten ?? "n/a"}
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
}
