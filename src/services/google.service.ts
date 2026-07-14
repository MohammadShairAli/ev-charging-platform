import { appConfig } from "@/src/lib/config";
import type { DirectionsRequest, DirectionsResult, Station } from "@/src/types";
import { isLikelyChargingStation } from "@/src/utils/station-quality";

type GooglePlace = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  vicinity?: string;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  formatted_phone_number?: string;
  website?: string;
  types?: string[];
};

type PlacesResponse = {
  results?: GooglePlace[];
  status?: string;
};

type DirectionsResponse = {
  routes?: Array<{
    overview_polyline?: { points?: string };
    legs?: Array<{
      distance?: { text?: string };
      duration?: { text?: string };
    }>;
  }>;
  status?: string;
  error_message?: string;
};

function requireGoogleKey() {
  if (!appConfig.google.mapsApiKey) {
    throw new Error("Google Maps API key is missing.");
  }

  return appConfig.google.mapsApiKey;
}

function normalizePlace(place: GooglePlace): Station | null {
  const location = place.geometry?.location;

  if (!place.place_id || !place.name || !location) {
    return null;
  }

  return {
    id: place.place_id,
    google_place_id: place.place_id,
    name: place.name,
    address: place.formatted_address || place.vicinity || null,
    latitude: location.lat,
    longitude: location.lng,
    phone: place.formatted_phone_number || null,
    website: place.website || null,
    rating: place.rating || null,
    operator: null,
    created_at: null,
    updated_at: null,
  };
}

export class GoogleService {
  async searchEvStations(query: string) {
    const key = requireGoogleKey();
    const url = new URL(`${appConfig.google.placesApiUrl}/textsearch/json`);
    url.searchParams.set("query", `${query || "Pakistan"} EV charging station`);
    url.searchParams.set("key", key);

    const response = await fetch(url, { cache: "no-store" });
    const data = (await response.json()) as PlacesResponse;

    if (!response.ok || data.status === "REQUEST_DENIED") {
      throw new Error("Google Places API unavailable.");
    }

    return (data.results || [])
      .filter((place) => place.types?.includes("electric_vehicle_charging_station") || isLikelyGoogleChargingPlace(place))
      .map(normalizePlace)
      .filter((station): station is Station => Boolean(station));
  }

  async searchNearbyEvStations(origin: { lat: number; lng: number }, radiusMeters = 50000) {
    const key = requireGoogleKey();
    const url = new URL(`${appConfig.google.placesApiUrl}/nearbysearch/json`);
    url.searchParams.set("location", `${origin.lat},${origin.lng}`);
    url.searchParams.set("radius", String(Math.min(Math.max(radiusMeters, 1000), 50000)));
    url.searchParams.set("keyword", "EV charging station");
    url.searchParams.set("type", "electric_vehicle_charging_station");
    url.searchParams.set("key", key);

    const response = await fetch(url, { cache: "no-store" });
    const data = (await response.json()) as PlacesResponse;

    if (!response.ok || data.status === "REQUEST_DENIED") {
      throw new Error("Google Places API unavailable.");
    }

    return (data.results || [])
      .filter((place) => place.types?.includes("electric_vehicle_charging_station") || isLikelyGoogleChargingPlace(place))
      .map(normalizePlace)
      .filter((station): station is Station => Boolean(station));
  }

  async findEvStationByPlaceId(placeId: string) {
    const key = requireGoogleKey();
    const url = new URL(`${appConfig.google.placesApiUrl}/details/json`);
    url.searchParams.set("place_id", placeId.replace(/^google-/, ""));
    url.searchParams.set("fields", "place_id,name,formatted_address,geometry,rating,formatted_phone_number,website,types");
    url.searchParams.set("key", key);

    const response = await fetch(url, { cache: "no-store" });
    const data = (await response.json()) as PlacesResponse & { result?: GooglePlace; error_message?: string };

    if (!response.ok || data.status === "REQUEST_DENIED") {
      throw new Error(data.error_message || "Google Places API unavailable.");
    }

    if (!data.result || !isLikelyGoogleChargingPlace(data.result)) {
      return null;
    }

    return normalizePlace(data.result);
  }

  async getDirections(input: DirectionsRequest): Promise<DirectionsResult> {
    const key = requireGoogleKey();
    const url = new URL(appConfig.google.directionsApiUrl);
    url.searchParams.set("origin", `${input.origin.lat},${input.origin.lng}`);
    url.searchParams.set("destination", `${input.destination.lat},${input.destination.lng}`);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("key", key);

    const response = await fetch(url, { cache: "no-store" });
    const data = (await response.json()) as DirectionsResponse;
    const leg = data.routes?.[0]?.legs?.[0];

    if (!response.ok || !leg) {
      throw new Error(data.error_message || "Directions unavailable.");
    }

    return {
      distanceText: leg.distance?.text || "Distance unavailable",
      durationText: leg.duration?.text || "ETA unavailable",
      polyline: data.routes?.[0]?.overview_polyline?.points || null,
    };
  }
}

export const googleService = new GoogleService();

function isLikelyGoogleChargingPlace(place: GooglePlace) {
  return isLikelyChargingStation({
    name: place.name || "",
    address: place.formatted_address || null,
    operator: null,
  });
}
