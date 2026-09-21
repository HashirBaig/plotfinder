import L from "leaflet";

import { BAG_PAND_URL, LOCATION_SEARCH_URL } from "./bag.constants";

import { pointInsidePolygon } from "./bag.geometry";

import type {
  FeatureCollectionResponse,
  LocationSearchFeature,
  LocationSearchResponse,
  PandFeature,
} from "./bag.types";

export const searchAddresses = async (
  query: string,
  signal?: AbortSignal,
): Promise<LocationSearchFeature[]> => {
  const params = new URLSearchParams();

  params.set("q", `${query} Enschede`);

  params.set("adres[version]", "1");

  params.set("limit", "10");

  params.set("f", "json");

  const response = await fetch(`${LOCATION_SEARCH_URL}?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Location API failed: ${response.status}`);
  }

  const data = (await response.json()) as LocationSearchResponse;

  return (data.features ?? [])
    .filter((feature) =>
      feature.properties.display_name?.toLowerCase().includes("enschede"),
    )
    .slice(0, 10);
};

export const findPandAtLocation = async (
  map: L.Map,
  lng: number,
  lat: number,
): Promise<PandFeature | undefined> => {
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

  const containingBuilding = buildings.find((building) =>
    pointInsidePolygon(lng, lat, building.geometry),
  );

  if (containingBuilding) {
    return containingBuilding;
  }

  // Fallback:
  // closest building
  let closest: PandFeature | undefined;

  let closestDistance = Infinity;

  for (const building of buildings) {
    const layer = L.geoJSON(building);

    const center = layer.getBounds().getCenter();

    const distance = map.distance([lat, lng], center);

    if (distance < closestDistance) {
      closestDistance = distance;

      closest = building;
    }
  }

  return closest;
};
