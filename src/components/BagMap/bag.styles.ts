import type { BagProps } from "./bag.types";

export const colorByYear = (year?: number) =>
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

export const pandStyle = (properties: BagProps) => ({
  fill: true,

  fillColor: colorByYear(properties.bouwjaar),

  fillOpacity: 0.6,

  color: "#1f2937",

  weight: 0.6,
});

export const layerStyles = new Proxy(
  {
    pand: pandStyle,
  } as Record<string, unknown>,

  {
    get: (target, name) =>
      typeof name === "string" && name in target ? target[name] : [],
  },
);
