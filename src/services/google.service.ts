import { appConfig } from "@/src/lib/config";
import type { DirectionsRequest, DirectionsResult, Station } from "@/src/types";

type GooglePlace = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  formatted_phone_number?: string;
  website?: string;
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
    address: place.formatted_address || null,
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

    const response = await fetch(url, { next: { revalidate: 3600 } });
    const data = (await response.json()) as PlacesResponse;

    if (!response.ok || data.status === "REQUEST_DENIED") {
      throw new Error("Google Places API unavailable.");
    }

    return (data.results || []).map(normalizePlace).filter((station): station is Station => Boolean(station));
  }

  async getDirections(input: DirectionsRequest): Promise<DirectionsResult> {
    const key = requireGoogleKey();
    const url = new URL(appConfig.google.directionsApiUrl);
    url.searchParams.set("origin", `${input.origin.lat},${input.origin.lng}`);
    url.searchParams.set("destination", `${input.destination.lat},${input.destination.lng}`);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("key", key);

    const response = await fetch(url);
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
