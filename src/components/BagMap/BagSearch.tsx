"use client";

import { useEffect, useRef, useState } from "react";

import type { MutableRefObject } from "react";

import { useMap } from "react-leaflet";

import L from "leaflet";

import { Loader2, Search, X } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { Input } from "@/components/ui/input";

import { findPandAtLocation, searchAddresses } from "./bag.api";

import type { LocationSearchFeature, VectorGridLayer } from "./bag.types";

interface BagSearchProps {
  vectorLayerRef: MutableRefObject<VectorGridLayer | null>;
}

export default function BagSearch({ vectorLayerRef }: BagSearchProps) {
  const map = useMap();

  const [query, setQuery] = useState("");

  const [results, setResults] = useState<LocationSearchFeature[]>([]);

  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);

  const highlightRef = useRef<L.GeoJSON | null>(null);

  const previousFeatureId = useRef<string | null>(null);

  const skipNextSearch = useRef(false);

  // ------------------------------------------------
  // Autocomplete
  // ------------------------------------------------

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;

      return;
    }

    const value = query.trim();

    if (value.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setOpen(false);

      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);

        const addresses = await searchAddresses(value, controller.signal);

        setResults(addresses);

        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error(error);
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

  // ------------------------------------------------
  // Select address
  // ------------------------------------------------

  const selectAddress = async (address: LocationSearchFeature) => {
    const label = address.properties.display_name;

    skipNextSearch.current = true;

    setQuery(label);

    setOpen(false);

    setResults([]);

    try {
      setLoading(true);

      if (!address.geometry) {
        throw new Error("Address contains no location.");
      }

      const [lng, lat] = address.geometry.coordinates;

      map.flyTo([lat, lng], 19, {
        animate: true,

        duration: 0.7,
      });

      const feature = await findPandAtLocation(map, lng, lat);

      if (!feature) {
        throw new Error(`No building found near ${label}.`);
      }

      const pandId = feature.properties.identificatie;

      if (previousFeatureId.current) {
        vectorLayerRef.current?.resetFeatureStyle(previousFeatureId.current);
      }

      previousFeatureId.current = pandId;

      vectorLayerRef.current?.setFeatureStyle(pandId, {
        fill: true,

        fillColor: "#facc15",

        fillOpacity: 0.9,

        color: "#ef4444",

        weight: 3,
      });

      if (highlightRef.current) {
        map.removeLayer(highlightRef.current);
      }

      const highlight = L.geoJSON(feature, {
        style: {
          color: "#ef4444",

          weight: 4,

          fill: true,

          fillColor: "#facc15",

          fillOpacity: 0.45,
        },

        interactive: false,
      });

      highlight.addTo(map);

      highlight.bringToFront();

      highlightRef.current = highlight;

      const bounds = highlight.getBounds();

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [120, 120],

          maxZoom: 19,

          animate: true,
        });
      }
    } catch (error) {
      console.error("Address selection failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        absolute
        left-1/2
        top-4
        z-1000
        w-[min(430px,calc(100%-32px))]
        -translate-x-1/2
      "
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
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
            placeholder="Search address in Enschede..."
            autoComplete="off"
            className="
      h-12
      border-0
      pl-10
      pr-16
      shadow-none
      focus-visible:ring-0
    "
          />

          {loading && (
            <Loader2
              className="
        pointer-events-none
        absolute
        right-10
        h-4
        w-4
        animate-spin
        text-muted-foreground
      "
            />
          )}

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setOpen(false);
              }}
              className="
        absolute
        right-3
        flex
        h-7
        w-7
        items-center
        justify-center
        rounded-md
        text-muted-foreground
        transition-colors
        hover:bg-muted
        hover:text-foreground
      "
              aria-label="Clear search"
            >
              <X
                className="h-4 w-4"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setOpen(false);

                  if (previousFeatureId.current) {
                    vectorLayerRef.current?.resetFeatureStyle(
                      previousFeatureId.current,
                    );

                    previousFeatureId.current = null;
                  }

                  if (highlightRef.current) {
                    map.removeLayer(highlightRef.current);
                    highlightRef.current = null;
                  }
                }}
              />
            </button>
          )}
        </div>

        {open && query.trim().length >= 2 && (
          <CommandList
            className="
              absolute
              top-[calc(100%+8px)]
              z-1100
              max-h-80
              w-full
              rounded-xl
              border
              bg-background
              p-1
              shadow-xl
            "
          >
            {!loading && results.length === 0 && (
              <CommandEmpty>No addresses found.</CommandEmpty>
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
                  {feature.properties.display_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
    </div>
  );
}
