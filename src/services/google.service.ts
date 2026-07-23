import { appConfig } from "@/src/lib/config";
import type {
  DirectionsRequest,
  DirectionsResult,
  LatLngLiteral,
  NearbyFoodAndCoffee,
  NearbyFoodPlace,
  Station,
  StationAmenitiesData,
} from "@/src/types";
import { calculateDistanceKm } from "@/src/utils/distance";
import { isLikelyChargingStation, isStationInPakistan } from "@/src/utils/station-quality";

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

type PlacesAutocompleteResponse = {
  predictions?: Array<{
    place_id?: string;
    description?: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
  }>;
  status?: string;
};

type GeocodingResponse = {
  results?: Array<{
    geometry?: {
      location?: LatLngLiteral;
    };
  }>;
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

type GooglePlaceAmenities = {
  currentOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  restroom?: boolean;
  parkingOptions?: Record<string, boolean>;
  servesCoffee?: boolean;
  dineIn?: boolean;
  servesBreakfast?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesBrunch?: boolean;
  types?: string[];
  photos?: Array<{
    name?: string;
    authorAttributions?: Array<{
      displayName?: string;
      uri?: string;
    }>;
  }>;
};

type GoogleNearbyPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  rating?: number;
  primaryType?: string;
  types?: string[];
};

type GoogleNearbyResponse = {
  places?: GoogleNearbyPlace[];
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

function normalizeNearbyChargingPlace(place: GoogleNearbyPlace): Station | null {
  const name = place.displayName?.text?.trim();
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;

  if (!place.id || !name || typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return {
    id: place.id,
    google_place_id: place.id,
    name,
    address: place.formattedAddress || null,
    latitude,
    longitude,
    phone: null,
    website: null,
    rating: place.rating || null,
    operator: null,
    created_at: null,
    updated_at: null,
  };
}

export class GoogleService {
  async getPlaceLocation(placeId: string) {
    const key = requireGoogleKey();
    const url = new URL(`${appConfig.google.placesApiUrl}/details/json`);
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "place_id,name,formatted_address,geometry");
    url.searchParams.set("key", key);

    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json() as PlacesResponse & {
      result?: GooglePlace;
      error_message?: string;
    };
    const location = data.result?.geometry?.location;

    if (!response.ok || data.status === "REQUEST_DENIED" || !location) {
      throw new Error(data.error_message || "Google place location is unavailable.");
    }

    return {
      name: data.result?.formatted_address || data.result?.name || "",
      location,
    };
  }

  async geocodeLocation(query: string) {
    const key = requireGoogleKey();
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query.trim());
    url.searchParams.set("components", "country:PK");
    url.searchParams.set("region", "pk");
    url.searchParams.set("key", key);

    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json() as GeocodingResponse;

    if (!response.ok || data.status === "REQUEST_DENIED") {
      throw new Error("Google Geocoding API is unavailable.");
    }

    return data.results?.[0]?.geometry?.location || null;
  }

  async searchLocationSuggestions(query: string) {
    const key = requireGoogleKey();
    const url = new URL(`${appConfig.google.placesApiUrl}/autocomplete/json`);
    url.searchParams.set("input", query.trim());
    url.searchParams.set("components", "country:pk");
    url.searchParams.set("language", "en");
    url.searchParams.set("region", "pk");
    url.searchParams.set("key", key);

    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json() as PlacesAutocompleteResponse;

    if (!response.ok || data.status === "REQUEST_DENIED") {
      throw new Error("Google Places autocomplete is unavailable.");
    }

    return (data.predictions || []).flatMap((prediction) => {
      const label = prediction.structured_formatting?.main_text?.trim()
        || prediction.description?.trim();

      if (!label) {
        return [];
      }

      return [{
        id: prediction.place_id || prediction.description || label,
        label,
        detail: prediction.structured_formatting?.secondary_text?.trim() || "Pakistan",
        value: prediction.description?.trim() || label,
        placeId: prediction.place_id,
      }];
    });
  }

  async searchEvStations(query: string) {
    const key = requireGoogleKey();
    const url = new URL(`${appConfig.google.placesApiUrl}/textsearch/json`);
    url.searchParams.set("query", `${query || ""} EV charging station in Pakistan`.trim());
    url.searchParams.set("region", "pk");
    url.searchParams.set("key", key);

    const response = await fetch(url, { cache: "no-store" });
    const data = (await response.json()) as PlacesResponse;

    if (!response.ok || data.status === "REQUEST_DENIED") {
      throw new Error("Google Places API unavailable.");
    }

    return (data.results || [])
      .filter((place) => place.types?.includes("electric_vehicle_charging_station") || isLikelyGoogleChargingPlace(place))
      .map(normalizePlace)
      .filter((station): station is Station => Boolean(station))
      .filter(isStationInPakistan);
  }

  async searchNearbyEvStations(origin: { lat: number; lng: number }, radiusMeters = 50000) {
    const key = requireGoogleKey();
    const radius = Math.min(Math.max(radiusMeters, 1000), 50000);
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types",
      },
      body: JSON.stringify({
        includedTypes: ["electric_vehicle_charging_station"],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        languageCode: "en",
        regionCode: "PK",
        locationRestriction: {
          circle: {
            center: {
              latitude: origin.lat,
              longitude: origin.lng,
            },
            radius,
          },
        },
      }),
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json() as GoogleNearbyResponse;
      const stations = (data.places || [])
        .map(normalizeNearbyChargingPlace)
        .filter((station): station is Station => Boolean(station))
        .filter(isStationInPakistan);
      return stations;
    }

    // Keep compatibility when Places API (New) has not yet been enabled.
    const url = new URL(`${appConfig.google.placesApiUrl}/nearbysearch/json`);
    url.searchParams.set("location", `${origin.lat},${origin.lng}`);
    url.searchParams.set("radius", String(radius));
    url.searchParams.set("keyword", "EV charging station");
    url.searchParams.set("type", "electric_vehicle_charging_station");
    url.searchParams.set("region", "pk");
    url.searchParams.set("key", key);

    const legacyResponse = await fetch(url, { cache: "no-store" });
    const data = (await legacyResponse.json()) as PlacesResponse;

    if (!legacyResponse.ok || data.status === "REQUEST_DENIED") {
      throw new Error("Google Places API unavailable.");
    }

    return (data.results || [])
      .filter((place) => place.types?.includes("electric_vehicle_charging_station") || isLikelyGoogleChargingPlace(place))
      .map(normalizePlace)
      .filter((station): station is Station => Boolean(station))
      .filter(isStationInPakistan);
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

    const station = normalizePlace(data.result);
    return station && isStationInPakistan(station) ? station : null;
  }

  async getPlaceAmenities(placeId: string): Promise<StationAmenitiesData> {
    const key = requireGoogleKey();
    const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId.replace(/^google-/, ""))}`);
    url.searchParams.set("languageCode", "en");
    url.searchParams.set("regionCode", "PK");
    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": [
          "currentOpeningHours",
          "restroom",
          "parkingOptions",
          "servesCoffee",
          "dineIn",
          "servesBreakfast",
          "servesLunch",
          "servesDinner",
          "servesBrunch",
          "types",
          "photos",
        ].join(","),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Google Places amenities are unavailable.");
    }

    const data = await response.json() as GooglePlaceAmenities;
    const restaurantSignals = [
      data.dineIn,
      data.servesBreakfast,
      data.servesLunch,
      data.servesDinner,
      data.servesBrunch,
    ];
    const hasRestaurantType = data.types?.some((type) => ["restaurant", "meal_takeaway", "meal_delivery"].includes(type));
    const restaurant = hasRestaurantType || restaurantSignals.some((value) => value === true)
      ? true
      : restaurantSignals.some((value) => typeof value === "boolean")
        ? false
        : null;
    const parkingValues = data.parkingOptions ? Object.values(data.parkingOptions) : null;
    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "Asia/Karachi",
    }).format(new Date());
    const todayHours = data.currentOpeningHours?.weekdayDescriptions
      ?.find((description) => description.toLowerCase().startsWith(weekday.toLowerCase()))
      ?.replace(/^[^:]+:\s*/, "") || null;

    return {
      openNow: booleanOrNull(data.currentOpeningHours?.openNow),
      todayHours,
      restroom: booleanOrNull(data.restroom),
      restaurant,
      prayerArea: null,
      servesCoffee: booleanOrNull(data.servesCoffee),
      security: null,
      parking: parkingValues ? parkingValues.some(Boolean) : null,
      photoCount: data.photos?.length ?? 0,
      photos: (data.photos || []).slice(0, 6).map((photo) => ({
        attributionName: photo.authorAttributions?.[0]?.displayName || null,
        attributionUri: photo.authorAttributions?.[0]?.uri || null,
      })),
    };
  }

  async searchNearbyFoodAndCoffee(origin: LatLngLiteral): Promise<NearbyFoodAndCoffee> {
    const key = requireGoogleKey();
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.primaryType,places.types",
      },
      body: JSON.stringify({
        includedTypes: ["restaurant", "cafe", "coffee_shop"],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        languageCode: "en",
        regionCode: "PK",
        locationRestriction: {
          circle: {
            center: {
              latitude: origin.lat,
              longitude: origin.lng,
            },
            radius: 1000,
          },
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Nearby food and coffee places are unavailable.");
    }

    const data = await response.json() as GoogleNearbyResponse;
    const coffee: NearbyFoodPlace[] = [];
    const restaurants: NearbyFoodPlace[] = [];

    for (const place of data.places || []) {
      const latitude = place.location?.latitude;
      const longitude = place.location?.longitude;
      const name = place.displayName?.text?.trim();

      if (!name || typeof latitude !== "number" || typeof longitude !== "number") {
        continue;
      }

      const distanceKm = calculateDistanceKm(origin, { lat: latitude, lng: longitude });

      if (distanceKm > 1) {
        continue;
      }

      const summary: NearbyFoodPlace = {
        name,
        address: place.formattedAddress || null,
        distanceKm,
      };
      const types = new Set([place.primaryType, ...(place.types || [])].filter(Boolean));
      const isCoffee = types.has("cafe") || types.has("coffee_shop");
      const isRestaurant = [...types].some((type) => type === "restaurant" || type?.endsWith("_restaurant"));

      if (isCoffee && coffee.length < 8) {
        coffee.push(summary);
      } else if (isRestaurant && restaurants.length < 8) {
        restaurants.push(summary);
      }
    }

    return { coffee, restaurants };
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

function booleanOrNull(value: boolean | undefined) {
  return typeof value === "boolean" ? value : null;
}
