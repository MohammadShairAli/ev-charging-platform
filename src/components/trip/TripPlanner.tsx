"use client";

import { FormEvent, KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap } from "@/src/components/map/GoogleMap";
import {
  type PlannerVehicle,
  VehicleSelector,
  vehicleLabel,
} from "@/src/components/trip/VehicleSelector";
import { ButtonLink } from "@/src/components/ui/ButtonLink";
import { appConfig } from "@/src/lib/config";
import {
  PROFILE_STORAGE_KEY,
  TRIP_DRAFT_STORAGE_KEY,
  type StoredProfile,
  type StoredTripDraft,
} from "@/src/lib/local-storage";
import type { LatLngLiteral, Station } from "@/src/types";
import { calculateDistanceKm } from "@/src/utils/distance";
import {
  ARRIVAL_RESERVE_PERCENT,
  chooseChargingStops,
  chooseRemainingStopsAfter,
  reachableChargingOptions,
} from "@/src/utils/trip-range";

type GoogleLatLng = {
  lat: () => number;
  lng: () => number;
};

type GoogleDirectionsLeg = {
  distance?: { text?: string; value?: number };
  duration?: { text?: string; value?: number };
  start_location?: GoogleLatLng;
  end_location?: GoogleLatLng;
};

type GoogleDirectionsRoute = {
  overview_path?: GoogleLatLng[];
  legs?: GoogleDirectionsLeg[];
};

type GoogleRoutePoint = {
  lat: number;
  lng: number;
};

type GoogleRouteLeg = {
  distanceMeters?: number;
  durationMillis?: number;
  localizedValues?: { distance?: string; duration?: string };
  startLocation?: GoogleRoutePoint;
  endLocation?: GoogleRoutePoint;
};

type GoogleRoute = {
  path?: GoogleRoutePoint[];
  legs?: GoogleRouteLeg[];
};

type GoogleRouteLibrary = {
  Route: {
    computeRoutes: (request: {
      origin: string | LatLngLiteral;
      destination: string | LatLngLiteral;
      travelMode: "DRIVING";
      fields: string[];
      intermediates?: Array<{ location: LatLngLiteral }>;
    }) => Promise<{ routes?: GoogleRoute[] }>;
  };
};

type GooglePlace = {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  googleMapsURI?: string;
  location?: GoogleLatLng;
  rating?: number;
};

type GooglePlaceLibrary = {
  Place: {
    searchNearby: (request: {
      fields: string[];
      locationRestriction: { center: LatLngLiteral; radius: number };
      includedPrimaryTypes: string[];
      maxResultCount: number;
      rankPreference: "DISTANCE";
    }) => Promise<{ places: GooglePlace[] }>;
  };
  PlacesService?: new (container: HTMLDivElement) => {
    nearbySearch: (
      request: {
        location: LatLngLiteral;
        radius: number;
        type: string;
      },
      callback: (results: LegacyGooglePlace[] | null, status: string) => void,
    ) => void;
  };
  AutocompleteSessionToken?: new () => unknown;
  AutocompleteSuggestion?: {
    fetchAutocompleteSuggestions: (request: {
      input: string;
      includedRegionCodes: string[];
      sessionToken: unknown;
    }) => Promise<{ suggestions: GoogleAutocompleteSuggestion[] }>;
  };
};

type GoogleAutocompletePlace = {
  displayName?: string;
  formattedAddress?: string;
  location?: GoogleLatLng;
  fetchFields: (request: { fields: string[] }) => Promise<void>;
};

type GooglePlacePrediction = {
  text: { toString: () => string };
  toPlace: () => GoogleAutocompletePlace;
};

type GoogleAutocompleteSuggestion = {
  placePrediction?: GooglePlacePrediction;
};

type LegacyGooglePlace = {
  place_id?: string;
  name?: string;
  vicinity?: string;
  rating?: number;
  geometry?: { location?: GoogleLatLng };
};

type TripGoogleMaps = {
  importLibrary: (library: string) => Promise<unknown>;
};

type TripWindow = Window & {
  google?: { maps: TripGoogleMaps };
  initTripPlannerMaps?: () => void;
};

type ChargingCandidate = {
  station: Station;
  coordinates: LatLngLiteral;
  progressKm: number;
  corridorKm: number;
};

type PlannedStop = {
  station: Station;
  coordinates: LatLngLiteral;
  arrivalLeg: GoogleDirectionsLeg;
  progressKm: number;
};

type TripPlan = {
  source: "google";
  origin: LatLngLiteral;
  destination: LatLngLiteral;
  routePath: LatLngLiteral[];
  stops: PlannedStop[];
  finalLeg: GoogleDirectionsLeg;
  totalDistanceKm: number;
  totalDurationSeconds: number;
  reserveRangeKm: number;
  carRangeKm: number;
  currentChargePercent: number;
  vehicleName: string;
  baseRouteDistanceKm: number;
  chargingCandidates: ChargingCandidate[];
};

type TripPlannerProps = {
  stations: Station[];
};

const MAX_CHARGING_STOPS = 8;
const MAX_ROUTE_SEARCH_CHECKPOINTS = 16;
const TRIP_RESULT_QUERY_KEY = "result";
const TRIP_RESULT_QUERY_VALUE = "1";
let mapsLoadingPromise: Promise<TripGoogleMaps> | null = null;

function loadGoogleMaps() {
  const tripWindow = window as TripWindow;

  if (tripWindow.google?.maps) {
    return Promise.resolve(tripWindow.google.maps);
  }

  if (mapsLoadingPromise) {
    return mapsLoadingPromise;
  }

  mapsLoadingPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (tripWindow.google?.maps) {
        resolve(tripWindow.google.maps);
      } else {
        reject(new Error("Google Maps did not finish loading."));
      }
    };
    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="maps.googleapis.com/maps/api/js"]');

    if (existingScript) {
      let attempts = 0;
      const interval = window.setInterval(() => {
        attempts += 1;

        if (tripWindow.google?.maps) {
          window.clearInterval(interval);
          finish();
        } else if (attempts >= 100) {
          window.clearInterval(interval);
          reject(new Error("Google Maps did not finish loading."));
        }
      }, 100);
      return;
    }

    tripWindow.initTripPlannerMaps = finish;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${appConfig.google.browserMapsApiKey}&callback=initTripPlannerMaps&loading=async`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });

  return mapsLoadingPromise;
}

function toLiteral(point?: GoogleLatLng): LatLngLiteral | null {
  return point ? { lat: point.lat(), lng: point.lng() } : null;
}

function routePoint(point?: GoogleRoutePoint): GoogleLatLng | undefined {
  return point
    ? { lat: () => point.lat, lng: () => point.lng }
    : undefined;
}

function formatDistanceMeters(distanceMeters?: number) {
  if (!distanceMeters) {
    return undefined;
  }

  return distanceMeters >= 1000
    ? `${(distanceMeters / 1000).toFixed(1)} km`
    : `${Math.round(distanceMeters)} m`;
}

async function computeDirections(
  maps: TripGoogleMaps,
  request: {
    origin: string | LatLngLiteral;
    destination: string | LatLngLiteral;
    waypoints?: LatLngLiteral[];
  },
) {
  const { Route } = await maps.importLibrary("routes") as GoogleRouteLibrary;
  const { routes } = await Route.computeRoutes({
    origin: request.origin,
    destination: request.destination,
    travelMode: "DRIVING",
    fields: ["path", "legs"],
    intermediates: request.waypoints?.map((location) => ({ location })),
  });

  return {
    routes: routes?.map((route) => ({
      overview_path: route.path?.map((point) => routePoint(point)!),
      legs: route.legs?.map((leg) => ({
        distance: {
          text: leg.localizedValues?.distance || formatDistanceMeters(leg.distanceMeters),
          value: leg.distanceMeters,
        },
        duration: {
          text: leg.localizedValues?.duration,
          value: leg.durationMillis ? leg.durationMillis / 1000 : undefined,
        },
        start_location: routePoint(leg.startLocation),
        end_location: routePoint(leg.endLocation),
      })),
    })),
  } satisfies { routes?: GoogleDirectionsRoute[] };
}

function googleApiErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/REQUEST_DENIED|PERMISSION_DENIED|not allowed|not authorized|ApiNotActivated/i.test(message)) {
    return "Google Maps rejected this request. Enable Maps JavaScript API, Routes API, and Places API (New) for this key, allow this website in the key's Website restrictions, and make sure billing is active.";
  }

  return message || "The trip could not be planned.";
}

function getRoutePath(route: GoogleDirectionsRoute) {
  return (route.overview_path || []).map((point) => ({ lat: point.lat(), lng: point.lng() }));
}

function routeDistanceKm(legs: GoogleDirectionsLeg[]) {
  return legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0) / 1000;
}

function routeDurationSeconds(legs: GoogleDirectionsLeg[]) {
  return legs.reduce((total, leg) => total + (leg.duration?.value || 0), 0);
}

function cumulativePathDistances(path: LatLngLiteral[]) {
  const distances = [0];

  for (let index = 1; index < path.length; index += 1) {
    distances.push(distances[index - 1] + calculateDistanceKm(path[index - 1], path[index]));
  }

  return distances;
}

function pointAtRouteDistance(
  path: LatLngLiteral[],
  cumulativeDistances: number[],
  routeDistance: number,
  targetKm: number,
) {
  const pathDistance = cumulativeDistances.at(-1) || routeDistance;
  const targetPathDistance = routeDistance ? (targetKm / routeDistance) * pathDistance : targetKm;
  const index = cumulativeDistances.findIndex((distance) => distance >= targetPathDistance);

  return path[Math.max(0, index === -1 ? path.length - 1 : index)];
}

function projectOntoRoute(
  point: LatLngLiteral,
  path: LatLngLiteral[],
  cumulativeDistances: number[],
  routeDistance: number,
) {
  let closestIndex = 0;
  let corridorKm = Number.POSITIVE_INFINITY;

  path.forEach((routePoint, index) => {
    const distance = calculateDistanceKm(point, routePoint);

    if (distance < corridorKm) {
      corridorKm = distance;
      closestIndex = index;
    }
  });

  const pathDistance = cumulativeDistances.at(-1) || routeDistance;
  const progressKm = pathDistance
    ? (cumulativeDistances[closestIndex] / pathDistance) * routeDistance
    : 0;

  return { progressKm, corridorKm };
}

function stationCoordinates(station: Station): LatLngLiteral | null {
  if (station.latitude === null || station.longitude === null) {
    return null;
  }

  return { lat: station.latitude, lng: station.longitude };
}

function placeToStation(place: GooglePlace): Station | null {
  const coordinates = toLiteral(place.location);

  if (!place.id || !place.displayName || !coordinates) {
    return null;
  }

  return {
    id: `google-${place.id}`,
    google_place_id: place.id,
    name: place.displayName,
    address: place.formattedAddress || null,
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    phone: null,
    website: place.googleMapsURI || null,
    rating: place.rating || null,
    operator: "EV charging station",
    created_at: null,
    updated_at: null,
  };
}

function legacyPlaceToStation(place: LegacyGooglePlace): Station | null {
  const coordinates = toLiteral(place.geometry?.location);

  if (!place.place_id || !place.name || !coordinates) {
    return null;
  }

  return {
    id: `google-${place.place_id}`,
    google_place_id: place.place_id,
    name: place.name,
    address: place.vicinity || null,
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    phone: null,
    website: null,
    rating: place.rating || null,
    operator: "EV charging station",
    created_at: null,
    updated_at: null,
  };
}

async function searchChargingPlaces(
  placesLibrary: GooglePlaceLibrary,
  center: LatLngLiteral,
  radius: number,
) {
  try {
    const { places } = await placesLibrary.Place.searchNearby({
      fields: ["id", "displayName", "formattedAddress", "googleMapsURI", "location", "rating"],
      locationRestriction: { center, radius },
      includedPrimaryTypes: ["electric_vehicle_charging_station"],
      maxResultCount: 10,
      rankPreference: "DISTANCE",
    });

    return places.map(placeToStation).filter((station): station is Station => Boolean(station));
  } catch {
    const PlacesService = placesLibrary.PlacesService;

    if (!PlacesService) {
      return [];
    }

    return new Promise<Station[]>((resolve) => {
      const service = new PlacesService(document.createElement("div"));
      service.nearbySearch(
        {
          location: center,
          radius,
          type: "electric_vehicle_charging_station",
        },
        (results, status) => {
          if (status !== "OK" || !results) {
            resolve([]);
            return;
          }

          resolve(results.map(legacyPlaceToStation).filter((station): station is Station => Boolean(station)));
        },
      );
    });
  }
}

async function discoverChargingStations(
  maps: TripGoogleMaps,
  path: LatLngLiteral[],
  cumulativeDistances: number[],
  totalDistanceKm: number,
  carRangeKm: number,
) {
  const placesLibrary = await maps.importLibrary("places") as GooglePlaceLibrary;
  const checkpointGapKm = Math.max(40, Math.min(100, carRangeKm * 0.25));
  const checkpoints: LatLngLiteral[] = [];

  for (
    let distanceKm = checkpointGapKm;
    distanceKm < totalDistanceKm && checkpoints.length < MAX_ROUTE_SEARCH_CHECKPOINTS;
    distanceKm += checkpointGapKm
  ) {
    checkpoints.push(pointAtRouteDistance(path, cumulativeDistances, totalDistanceKm, distanceKm));
  }

  const searchRadius = Math.min(50000, Math.max(30000, carRangeKm * 250));
  const results = await Promise.all(
    checkpoints.map((center) => searchChargingPlaces(placesLibrary, center, searchRadius)),
  );

  return results.flat();
}

function buildCandidates(
  stations: Station[],
  path: LatLngLiteral[],
  cumulativeDistances: number[],
  totalDistanceKm: number,
) {
  const seen = new Set<string>();

  return stations.reduce<ChargingCandidate[]>((candidates, station) => {
    const coordinates = stationCoordinates(station);

    if (!coordinates) {
      return candidates;
    }

    const key = station.google_place_id || `${coordinates.lat.toFixed(4)},${coordinates.lng.toFixed(4)}`;

    if (seen.has(key)) {
      return candidates;
    }

    seen.add(key);
    const projection = projectOntoRoute(coordinates, path, cumulativeDistances, totalDistanceKm);

    if (projection.corridorKm <= 50 && projection.progressKm > 3 && projection.progressKm < totalDistanceKm - 3) {
      candidates.push({ station, coordinates, ...projection });
    }

    return candidates;
  }, []);
}

function readStoredProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "{}") as StoredProfile;
  } catch {
    return {};
  }
}

function readTripDraft() {
  try {
    return JSON.parse(localStorage.getItem(TRIP_DRAFT_STORAGE_KEY) || "{}") as Partial<StoredTripDraft>;
  } catch {
    return {};
  }
}

function formatDuration(totalSeconds: number) {
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours ? `${hours} hr ${minutes} min` : `${minutes} min`;
}

function legDistanceKm(leg: GoogleDirectionsLeg) {
  return (leg.distance?.value || 0) / 1000;
}

function chargeNeededForLeg(leg: GoogleDirectionsLeg, carRangeKm: number) {
  const exactPercent = carRangeKm ? (legDistanceKm(leg) / carRangeKm) * 100 : 100;
  const minimumPercent = Math.min(100, Math.ceil(exactPercent));
  const recommendedPercent = Math.min(100, Math.ceil(exactPercent + ARRIVAL_RESERVE_PERCENT));

  return { minimumPercent, recommendedPercent };
}

function plannedArrivalPercent(
  leg: GoogleDirectionsLeg,
  carRangeKm: number,
  departurePercent: number,
) {
  const usedPercent = carRangeKm ? (legDistanceKm(leg) / carRangeKm) * 100 : 100;
  return Math.max(0, Math.round(departurePercent - usedPercent));
}

function googleMapsTripUrl(plan: TripPlan) {
  const coordinate = (point: LatLngLiteral) => `${point.lat},${point.lng}`;
  const url = new URL("https://www.google.com/maps/dir/");

  url.searchParams.set("api", "1");
  url.searchParams.set("origin", coordinate(plan.origin));
  url.searchParams.set("destination", coordinate(plan.destination));
  url.searchParams.set("travelmode", "driving");
  url.searchParams.set("dir_action", "navigate");

  if (plan.stops.length) {
    url.searchParams.set(
      "waypoints",
      plan.stops.map((stop) => coordinate(stop.coordinates)).join("|"),
    );

    const waypointPlaceIds = plan.stops.map((stop) => stop.station.google_place_id);

    if (waypointPlaceIds.every((placeId): placeId is string => Boolean(placeId))) {
      url.searchParams.set("waypoint_place_ids", waypointPlaceIds.join("|"));
    }
  }

  return url.toString();
}

function tripResultSearchActive() {
  return new URLSearchParams(window.location.search).get(TRIP_RESULT_QUERY_KEY) === TRIP_RESULT_QUERY_VALUE;
}

function tripPlannerUrl(showResults: boolean) {
  const url = new URL(window.location.href);

  if (showResults) {
    url.searchParams.set(TRIP_RESULT_QUERY_KEY, TRIP_RESULT_QUERY_VALUE);
  } else {
    url.searchParams.delete(TRIP_RESULT_QUERY_KEY);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function LocationAutocompleteInput({
  id,
  label,
  value,
  placeholder,
  className = "",
  onValueChange,
  onPlaceSelect,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  className?: string;
  onValueChange: (value: string) => void;
  onPlaceSelect: (value: string, coordinates: LatLngLiteral | null) => void;
}) {
  const [suggestions, setSuggestions] = useState<GooglePlacePrediction[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const sessionTokenRef = useRef<unknown>(null);
  const skipNextSearchRef = useRef(false);
  const userEditedRef = useRef(false);

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    if (!userEditedRef.current) {
      return;
    }

    const query = value.trim();

    if (query.length < 2 || !appConfig.google.browserMapsApiKey) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timeout = window.setTimeout(async () => {
      try {
        const maps = await loadGoogleMaps();
        const placesLibrary = await maps.importLibrary("places") as GooglePlaceLibrary;
        const AutocompleteSuggestion = placesLibrary.AutocompleteSuggestion;
        const AutocompleteSessionToken = placesLibrary.AutocompleteSessionToken;

        if (!AutocompleteSuggestion || !AutocompleteSessionToken) {
          throw new Error("Google Places autocomplete is unavailable.");
        }

        sessionTokenRef.current ||= new AutocompleteSessionToken();
        const result = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          includedRegionCodes: ["pk"],
          sessionToken: sessionTokenRef.current,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        const nextSuggestions = result.suggestions
          .map((suggestion) => suggestion.placePrediction)
          .filter((prediction): prediction is GooglePlacePrediction => Boolean(prediction));
        setSuggestionError(null);
        setSuggestions(nextSuggestions);
        setActiveIndex(-1);
        setIsOpen(Boolean(nextSuggestions.length));
      } catch {
        if (requestId === requestIdRef.current) {
          setSuggestions([]);
          setSuggestionError("Suggestions unavailable. Enable Places API (New) and allow this website for the Google Maps key.");
          setIsOpen(true);
        }
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [value]);

  async function selectSuggestion(prediction: GooglePlacePrediction) {
    const predictionText = prediction.text.toString();

    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
      const selectedValue = place.formattedAddress || place.displayName || predictionText;

      skipNextSearchRef.current = true;
      userEditedRef.current = false;
      onPlaceSelect(selectedValue, toLiteral(place.location));
    } catch {
      skipNextSearchRef.current = true;
      userEditedRef.current = false;
      onPlaceSelect(predictionText, null);
    }

    requestIdRef.current += 1;
    sessionTokenRef.current = null;
    setSuggestions([]);
    setSuggestionError(null);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || !suggestions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className={`relative min-w-0 px-2 py-2 focus-within:bg-background ${className}`}>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          userEditedRef.current = true;

          if (nextValue.trim().length < 2) {
            requestIdRef.current += 1;
            setSuggestions([]);
            setSuggestionError(null);
            setIsOpen(false);
          }

          onValueChange(nextValue);
        }}
        onFocus={() => setIsOpen(Boolean(userEditedRef.current && (suggestions.length || suggestionError)))}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={`${id}-suggestions`}
        aria-activedescendant={activeIndex >= 0 ? `${id}-suggestion-${activeIndex}` : undefined}
        className="mt-0.5 min-h-8 w-full bg-transparent text-base font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted/70"
      />

      {isOpen && suggestionError ? (
        <div
          id={`${id}-suggestions`}
          role="status"
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border bg-secondary px-3 py-2 text-xs leading-5 text-muted shadow-xl"
        >
          {suggestionError}
        </div>
      ) : isOpen ? (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-secondary p-1 shadow-xl"
        >
          {suggestions.map((prediction, index) => (
            <li key={`${prediction.text.toString()}-${index}`} role="presentation">
              <button
                id={`${id}-suggestion-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => void selectSuggestion(prediction)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm leading-5 text-foreground transition ${index === activeIndex ? "bg-background" : "hover:bg-background"}`}
              >
                {prediction.text.toString()}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function TripPlanner({ stations }: TripPlannerProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startLocation, setStartLocation] = useState<LatLngLiteral | null>(null);
  const [endLocation, setEndLocation] = useState<LatLngLiteral | null>(null);
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<PlannerVehicle | null>(null);
  const [rangeKm, setRangeKm] = useState("");
  const [currentChargePercent, setCurrentChargePercent] = useState("100");
  const [editingRange, setEditingRange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [changingStopIndex, setChangingStopIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const profile = readStoredProfile();
      const draft = readTripDraft();
      const savedRange = profile.car?.rangeKm;

      setStart(draft.start || "");
      setEnd(draft.end || "");
      setStartLocation(null);
      setEndLocation(null);

      if (typeof draft.currentChargePercent === "number") {
        setCurrentChargePercent(String(draft.currentChargePercent));
      }

      if (savedRange && savedRange > 0) {
        setRangeKm(String(savedRange));
        if (profile.car?.make && profile.car.model) {
          const savedVehicle: PlannerVehicle = {
            id: `saved-${profile.car.make}-${profile.car.model}-${profile.car.variant || ""}`,
            brand: profile.car.make,
            model: profile.car.model,
            variant: profile.car.variant || "",
            kind: profile.car.kind || "EV",
            rangeKm: savedRange,
          };
          setSelectedVehicle(savedVehicle);
          setVehicleQuery(vehicleLabel(savedVehicle));
        }
      } else if (draft.rangeKm && draft.rangeKm > 0) {
        setRangeKm(String(draft.rangeKm));
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const syncResultsView = () => setShowResults(tripResultSearchActive());

    syncResultsView();
    window.addEventListener("popstate", syncResultsView);

    return () => window.removeEventListener("popstate", syncResultsView);
  }, []);

  const mapStations = useMemo(() => plan?.stops.map((stop) => stop.station) || [], [plan]);
  const isResultsView = showResults && Boolean(plan);

  function openResultsView(nextPlan: TripPlan) {
    setPlan(nextPlan);
    setShowResults(true);
    window.history.pushState(null, "", tripPlannerUrl(true));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeResultsView() {
    setShowResults(false);
    window.history.replaceState(null, "", tripPlannerUrl(false));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function changeChargingStop(index: number, stationId: string) {
    if (!plan || plan.stops[index]?.station.id === stationId) {
      return;
    }

    const candidate = plan.chargingCandidates.find((item) => item.station.id === stationId);

    if (!candidate) {
      setError("That charging station is no longer available for this route.");
      return;
    }

    setChangingStopIndex(index);
    setError(null);

    try {
      const maps = await loadGoogleMaps();
      const prefixStops = plan.stops.slice(0, index);
      const selectedStationIds = [
        ...prefixStops.map((stop) => stop.station.id),
        candidate.station.id,
      ];
      const remainingStops = chooseRemainingStopsAfter(
        plan.chargingCandidates,
        plan.baseRouteDistanceKm,
        candidate.progressKm,
        plan.carRangeKm,
        MAX_CHARGING_STOPS - prefixStops.length - 1,
        selectedStationIds,
      );
      const nextStops: PlannedStop[] = [
        ...prefixStops,
        ...[candidate, ...remainingStops].map((stopCandidate) => ({
          station: stopCandidate.station,
          coordinates: stopCandidate.coordinates,
          arrivalLeg: plan.finalLeg,
          progressKm: stopCandidate.progressKm,
        })),
      ];
      const result = await computeDirections(maps, {
        origin: plan.origin,
        destination: plan.destination,
        waypoints: nextStops.map((stop) => stop.coordinates),
      });
      const route = result.routes?.[0];
      const legs = route?.legs || [];
      const routePath = route ? getRoutePath(route) : [];

      if (!route || !routePath.length || legs.length !== nextStops.length + 1) {
        throw new Error("A route through that charging station could not be built.");
      }

      const safeLegRangeKm = plan.carRangeKm * ((100 - ARRIVAL_RESERVE_PERCENT) / 100);
      const firstLegRangeKm = plan.carRangeKm * (
        Math.max(0, plan.currentChargePercent - ARRIVAL_RESERVE_PERCENT) / 100
      );
      const overRangeLeg = legs.find((leg, legIndex) => (
        legDistanceKm(leg) > (legIndex === 0 ? firstLegRangeKm : safeLegRangeKm)
      ));

      if (overRangeLeg) {
        throw new Error(
          `That choice creates a ${overRangeLeg.distance?.text || "long"} leg and would use the ${ARRIVAL_RESERVE_PERCENT}% safety reserve. Choose another charger.`,
        );
      }

      setPlan({
        ...plan,
        routePath,
        stops: nextStops.map((stop, stopIndex) => ({ ...stop, arrivalLeg: legs[stopIndex] })),
        finalLeg: legs.at(-1)!,
        totalDistanceKm: routeDistanceKm(legs),
        totalDurationSeconds: routeDurationSeconds(legs),
      });
    } catch (caughtError) {
      setError(googleApiErrorMessage(caughtError));
    } finally {
      setChangingStopIndex(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedRange = Number(rangeKm);
    const parsedCurrentCharge = Number(currentChargePercent);

    if (!start.trim() || !end.trim()) {
      setError("Enter both a starting point and a destination.");
      return;
    }

    if (!selectedVehicle) {
      setError("Search for your car and select the exact model or variant from the list.");
      return;
    }

    if (!Number.isFinite(parsedRange) || parsedRange < 30) {
      setError("Enter a realistic full-charge range of at least 30 km.");
      return;
    }

    if (!Number.isFinite(parsedCurrentCharge) || parsedCurrentCharge < 0 || parsedCurrentCharge > 100) {
      setError("Enter the current battery charge from 0% to 100%.");
      return;
    }

    setLoading(true);
    setError(null);
    setPlan(null);
    setShowResults(false);

    try {
      const profile = readStoredProfile();
      const nextProfile: StoredProfile = {
        ...profile,
        car: {
          ...profile.car,
          make: selectedVehicle.brand,
          model: selectedVehicle.model,
          variant: selectedVehicle.variant,
          kind: selectedVehicle.kind,
          rangeKm: parsedRange,
        },
      };
      const draft: StoredTripDraft = {
        start: start.trim(),
        end: end.trim(),
        rangeKm: parsedRange,
        currentChargePercent: parsedCurrentCharge,
      };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
      localStorage.setItem(TRIP_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setEditingRange(false);

      if (!appConfig.google.browserMapsApiKey) {
        throw new Error("Add a Google Maps API key before planning a live trip.");
      }

      const maps = await loadGoogleMaps();
      const initialResult = await computeDirections(maps, {
        origin: startLocation || start.trim(),
        destination: endLocation || end.trim(),
      });
      const initialRoute = initialResult.routes?.[0];
      const initialLegs = initialRoute?.legs || [];
      const initialPath = initialRoute ? getRoutePath(initialRoute) : [];
      const totalDistanceKm = routeDistanceKm(initialLegs);

      if (!initialRoute || !initialPath.length || !initialLegs.length || !totalDistanceKm) {
        throw new Error("A driving route could not be found between those locations.");
      }

      const cumulativeDistances = cumulativePathDistances(initialPath);
      let discoveredStations: Station[] = [];

      try {
        discoveredStations = await discoverChargingStations(
          maps,
          initialPath,
          cumulativeDistances,
          totalDistanceKm,
          parsedRange,
        );
      } catch {
        discoveredStations = [];
      }

      const candidates = buildCandidates(
        [...stations, ...discoveredStations],
        initialPath,
        cumulativeDistances,
        totalDistanceKm,
      );
      const stops = chooseChargingStops(
        candidates,
        totalDistanceKm,
        parsedRange,
        parsedCurrentCharge,
        MAX_CHARGING_STOPS,
      );
      const finalResult = stops.length
        ? await computeDirections(maps, {
            origin: startLocation || start.trim(),
            destination: endLocation || end.trim(),
            waypoints: stops.map((stop) => stop.coordinates),
          })
        : initialResult;
      const finalRoute = finalResult.routes?.[0];
      const finalLegs = finalRoute?.legs || [];
      const finalPath = finalRoute ? getRoutePath(finalRoute) : [];
      const origin = toLiteral(finalLegs[0]?.start_location);
      const destination = toLiteral(finalLegs.at(-1)?.end_location);

      if (!finalRoute || !finalPath.length || !origin || !destination || finalLegs.length !== stops.length + 1) {
        throw new Error("The route could not be rebuilt through the selected charging stops.");
      }

      const safeLegRangeKm = parsedRange * ((100 - ARRIVAL_RESERVE_PERCENT) / 100);
      const firstLegRangeKm = parsedRange * (
        Math.max(0, parsedCurrentCharge - ARRIVAL_RESERVE_PERCENT) / 100
      );
      const overRangeLeg = finalLegs.find((leg, legIndex) => (
        legDistanceKm(leg) > (legIndex === 0 ? firstLegRangeKm : safeLegRangeKm)
      ));

      if (overRangeLeg) {
        throw new Error(
          `A route leg is ${overRangeLeg.distance?.text || "longer than expected"}, which would leave less than ${ARRIVAL_RESERVE_PERCENT}% battery. A safe plan could not be verified.`,
        );
      }

      openResultsView({
        source: "google",
        origin,
        destination,
        routePath: finalPath,
        stops: stops.map((stop, index) => ({
          station: stop.station,
          coordinates: stop.coordinates,
          arrivalLeg: finalLegs[index],
          progressKm: stop.progressKm,
        })),
        finalLeg: finalLegs.at(-1)!,
        totalDistanceKm: routeDistanceKm(finalLegs),
        totalDurationSeconds: routeDurationSeconds(finalLegs),
        reserveRangeKm: parsedRange * (ARRIVAL_RESERVE_PERCENT / 100),
        carRangeKm: parsedRange,
        currentChargePercent: parsedCurrentCharge,
        vehicleName: vehicleLabel(selectedVehicle),
        baseRouteDistanceKm: totalDistanceKm,
        chargingCandidates: candidates,
      });
    } catch (caughtError) {
      setError(googleApiErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  function swapLocations() {
    setStart(end);
    setEnd(start);
    setStartLocation(endLocation);
    setEndLocation(startLocation);
    setPlan(null);
  }

  if (isResultsView && plan) {
    return (
      <div className="mx-auto grid max-w-7xl gap-4 lg:gap-6">
        <div className="grid justify-items-start gap-3 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-x-5">
          <button
            type="button"
            onClick={closeResultsView}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-transparent px-0 py-2 text-sm font-semibold text-foreground transition hover:text-primary"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
              <path d="M19 12H5m0 0 6-6m-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
          <div>
            <p className="text-sm font-semibold text-primary">Plan my trip</p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">Your charging route</h1>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(23rem,0.8fr)] lg:items-start lg:gap-6">
          <div className="lg:sticky lg:top-24">
            <GoogleMap
              stations={mapStations}
              center={plan.origin}
              routeOrigin={plan.origin}
              routeDestination={plan.destination}
              routePath={plan.routePath}
              className="min-h-[22rem] lg:min-h-[calc(100vh-10rem)] lg:max-h-[48rem]"
            />
          </div>

          <div className="grid gap-4">
            <TripSummaryCard plan={plan} destinationName={end} />
            <ChargingItineraryCard
              plan={plan}
              startName={start}
              destinationName={end}
              changingStopIndex={changingStopIndex}
              stopError={error}
              onStopChange={(index, stationId) => void changeChargingStop(index, stationId)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)] lg:items-start lg:gap-7">
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6 lg:p-8">
        <p className="text-sm font-semibold text-primary">Plan my trip</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground lg:text-4xl">Build a charging route</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted lg:text-base lg:leading-7">
          Enter your journey and the planner will place verified charging stops before your battery range runs out.
        </p>

        <form className="mt-6 grid gap-4 lg:grid-cols-2 lg:gap-5" onSubmit={handleSubmit}>
          <fieldset className="rounded-2xl border border-border bg-background p-2 lg:col-span-2">
            <legend className="sr-only">Enter your route</legend>
            <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] grid-rows-2 rounded-xl border border-border bg-secondary">
              <div className="relative col-start-1 row-span-2 row-start-1 flex flex-col items-center justify-around py-3 text-primary">
                <span className="absolute bottom-[2.65rem] top-[2.65rem] w-px bg-border" aria-hidden="true" />
                <span className="relative z-10 grid h-8 w-8 place-items-center rounded-full bg-secondary" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <circle cx="10.5" cy="10.5" r="6.5" />
                    <path d="m15.5 15.5 4 4" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="relative z-10 grid h-8 w-8 place-items-center rounded-full bg-secondary" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                    <path d="M5 3.5a1 1 0 0 1 2 0V5h10.4a1 1 0 0 1 .8 1.6L16 9.5l2.2 2.9a1 1 0 0 1-.8 1.6H7v6.5a1 1 0 0 1-2 0v-17Z" />
                  </svg>
                </span>
              </div>

              <LocationAutocompleteInput
                id="trip-start"
                label="From"
                value={start}
                placeholder="Enter starting point"
                className="col-start-2 row-start-1 z-30 border-b border-border"
                onValueChange={(value) => {
                  setStart(value);
                  setStartLocation(null);
                }}
                onPlaceSelect={(value, coordinates) => {
                  setStart(value);
                  setStartLocation(coordinates);
                }}
              />

              <LocationAutocompleteInput
                id="trip-end"
                label="To"
                value={end}
                placeholder="Enter destination"
                className="col-start-2 row-start-2 z-20"
                onValueChange={(value) => {
                  setEnd(value);
                  setEndLocation(null);
                }}
                onPlaceSelect={(value, coordinates) => {
                  setEnd(value);
                  setEndLocation(coordinates);
                }}
              />

              <div className="col-start-3 row-span-2 row-start-1 grid place-items-center border-l border-border">
                <button
                  type="button"
                  onClick={swapLocations}
                  aria-label="Swap starting point and destination"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-muted transition hover:border-primary hover:text-primary"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                    <path d="M8 4v15m0-15L5 7m3-3 3 3M16 20V5m0 15 3-3m-3 3-3-3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </fieldset>


          <div className="lg:col-span-2">
            <VehicleSelector
              value={vehicleQuery}
              onValueChange={(value) => {
                setVehicleQuery(value);
                setSelectedVehicle(null);
                setRangeKm("");
                setEditingRange(false);
              }}
              onSelect={(vehicle) => {
                setSelectedVehicle(vehicle);
                setVehicleQuery(vehicleLabel(vehicle));
                setRangeKm(String(vehicle.rangeKm));
                setEditingRange(false);
                setError(null);
              }}
            />
          </div>

          {selectedVehicle ? (
            <div className="h-full rounded-xl border border-border bg-background p-3 lg:p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Full-charge range</p>
                  {!editingRange ? (
                    <p className="mt-1 text-lg font-bold text-foreground">{rangeKm} km</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRange((editing) => !editing)}
                  aria-label={editingRange ? "Finish editing car range" : "Edit car range"}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-secondary text-primary transition hover:border-primary"
                >
                  <span className="material-symbols-outlined text-[1.2rem]" aria-hidden="true">
                    {editingRange ? "check" : "edit"}
                  </span>
                </button>
              </div>
              {editingRange ? (
                <div className="relative mt-2">
                  <input
                    id="car-range"
                    type="number"
                    min="30"
                    max="1200"
                    step="1"
                    value={rangeKm}
                    onChange={(event) => setRangeKm(event.target.value)}
                    className="min-h-12 w-full rounded-xl border border-border bg-secondary px-4 pr-14 text-base text-foreground"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-muted">km</span>
                </div>
              ) : null}
              <p className="mt-2 text-xs leading-5 text-muted">
                Filled from the selected variant. Use the pencil if your real-world range is different.
              </p>
            </div>
          ) : null}

          <div className={selectedVehicle ? "" : "lg:col-span-2"}>
            <label htmlFor="current-charge" className="text-sm font-semibold text-foreground">Current battery charge</label>
            <div className="relative mt-2">
              <input
                id="current-charge"
                type="number"
                min="0"
                max="100"
                step="1"
                value={currentChargePercent}
                onChange={(event) => setCurrentChargePercent(event.target.value)}
                placeholder="30"
                className="min-h-12 w-full rounded-xl border border-border bg-secondary px-4 pr-12 text-base text-foreground placeholder:text-muted/70"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-muted">%</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">Used to check whether you can leave now or need to charge before starting.</p>
          </div>

          {error ? (
            <div role="alert" className="rounded-xl border border-border bg-background p-3 text-sm leading-6 text-foreground lg:col-span-2">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-secondary transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60 lg:col-span-2 lg:min-h-14 lg:text-base"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg viewBox="0 0 32 20" className="h-6 w-9 motion-safe:animate-bounce" aria-hidden="true">
                  <path d="M4 13h2l3-7h12l5 7h2a2 2 0 0 1 2 2v1H2v-1a2 2 0 0 1 2-2Z" className="fill-secondary/20 stroke-current" strokeWidth="1.5" />
                  <circle cx="9" cy="16" r="2.5" className="fill-current" />
                  <circle cx="24" cy="16" r="2.5" className="fill-current" />
                  <path d="m17 7-3 4h3l-2 4 5-6h-3l2-2h-2Z" className="fill-current" />
                </svg>
                Planning your safe route...
              </span>
            ) : "Make my trip"}
          </button>
        </form>
      </section>

      <section className="min-w-0 lg:sticky lg:top-24">
        {loading ? (
          <TripPlanningLoader />
        ) : (
          <TripDesktopPreview
            selectedVehicle={selectedVehicle}
            rangeKm={rangeKm}
            currentChargePercent={currentChargePercent}
          />
        )}
      </section>
    </div>
  );
}

function TripDesktopPreview({
  selectedVehicle,
  rangeKm,
  currentChargePercent,
}: {
  selectedVehicle: PlannerVehicle | null;
  rangeKm: string;
  currentChargePercent: string;
}) {
  const parsedRange = Number(rangeKm);
  const parsedCharge = Number(currentChargePercent);
  const hasRange = Number.isFinite(parsedRange) && parsedRange > 0;
  const hasCharge = Number.isFinite(parsedCharge) && parsedCharge >= 0 && parsedCharge <= 100;
  const safeRangeNow = hasRange && hasCharge
    ? Math.max(0, Math.round(parsedRange * ((parsedCharge - ARRIVAL_RESERVE_PERCENT) / 100)))
    : null;

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface lg:block">
      <div className="border-b border-border bg-background p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Trip readiness</p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">Your EV at a glance</h2>
          </div>
          <span className="material-symbols-outlined grid h-12 w-12 place-items-center rounded-full bg-primary text-[1.5rem] text-secondary" aria-hidden="true">
            route
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">
          Complete the details on the left. Your route, safe charging choices, and battery plan will appear here.
        </p>
      </div>

      <div className="grid gap-5 p-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted">Selected vehicle</p>
            <p className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-foreground">
              {selectedVehicle ? vehicleLabel(selectedVehicle) : "Choose your car"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted">Safe range now</p>
            <p className="mt-2 text-xl font-bold text-primary">
              {safeRangeNow === null ? "—" : `${safeRangeNow} km`}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-5">
          <p className="text-sm font-bold text-foreground">How your route is built</p>
          <ol className="mt-5 grid gap-0">
            <DesktopPreviewStep
              icon="location_on"
              title="Start with your current charge"
              detail={hasCharge ? `${parsedCharge}% battery entered` : "Enter your current battery"}
            />
            <DesktopPreviewStep
              icon="ev_station"
              title="Choose reachable chargers"
              detail="See early and later stops within the safe range"
            />
            <DesktopPreviewStep
              icon="flag"
              title="Reach your destination"
              detail="Extra stops are added whenever the next point is too far"
              last
            />
          </ol>
        </div>

        <div className="rounded-xl bg-primary p-4 text-secondary">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[1.35rem]" aria-hidden="true">shield</span>
            <div>
              <p className="text-sm font-bold">{ARRIVAL_RESERVE_PERCENT}% arrival reserve</p>
              <p className="mt-0.5 text-xs leading-5 text-secondary/75">
                Reachable distances keep this safety buffer available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopPreviewStep({
  icon,
  title,
  detail,
  last,
}: {
  icon: string;
  title: string;
  detail: string;
  last?: boolean;
}) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-x-3">
      <div className="flex flex-col items-center">
        <span className="material-symbols-outlined grid h-9 w-9 place-items-center rounded-full border border-primary/30 bg-secondary text-[1.1rem] text-primary" aria-hidden="true">
          {icon}
        </span>
        {!last ? <span className="min-h-8 w-px flex-1 bg-border" aria-hidden="true" /> : null}
      </div>
      <div className={last ? "pb-0" : "pb-5"}>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
      </div>
    </li>
  );
}

function TripPlanningLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-[28rem] place-items-center rounded-2xl border border-border bg-surface p-6 text-center"
    >
      <div className="w-full max-w-sm">
        <div className="mx-auto w-40 text-primary motion-safe:animate-bounce">
          <svg viewBox="0 0 180 90" className="h-auto w-full" aria-hidden="true">
            <path
              d="M25 57h9l11-24c2-5 7-8 13-8h55c7 0 13 3 17 9l14 23h8c7 0 12 5 12 12v2H15v-9c0-8 4-15 10-15Z"
              className="fill-primary/20 stroke-current"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M52 33h28v23H41l11-23Zm37 0h24c5 0 9 2 12 7l10 16H89V33Z" className="fill-secondary stroke-current" strokeWidth="3" />
            <circle cx="48" cy="70" r="11" className="fill-foreground stroke-secondary" strokeWidth="4" />
            <circle cx="133" cy="70" r="11" className="fill-foreground stroke-secondary" strokeWidth="4" />
            <path d="m96 39-10 14h10l-6 15 18-21H97l7-8H96Z" className="fill-primary" />
            <path d="M18 64H4m18-12H9" className="stroke-primary" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
        <div className="mx-auto -mt-2 h-1.5 w-52 overflow-hidden rounded-full bg-border">
          <div className="h-full w-2/3 rounded-full bg-primary motion-safe:animate-pulse" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-foreground">Planning your EV trip</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Finding charging stops that keep your battery at or above {ARRIVAL_RESERVE_PERCENT}% on arrival.
        </p>
      </div>
    </div>
  );
}

function TripSummaryCard({ plan, destinationName }: { plan: TripPlan; destinationName: string }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <DepartureAdvice plan={plan} destinationName={destinationName} />

      <div className="grid grid-cols-3 gap-2">
        <TripMetric label="Distance" value={`${Math.round(plan.totalDistanceKm)} km`} />
        <TripMetric label="Drive time" value={formatDuration(plan.totalDurationSeconds)} />
        <TripMetric label="Charge stops" value={String(plan.stops.length)} />
      </div>
      <p className="mt-3 text-center text-xs text-muted">Planned for {plan.vehicleName} at {plan.carRangeKm} km per full charge.</p>
    </section>
  );
}

function stopAlternatives(plan: TripPlan, stopIndex: number) {
  const currentStop = plan.stops[stopIndex];
  const previousProgressKm = plan.stops[stopIndex - 1]?.progressKm || 0;
  const safeRangeKm = plan.carRangeKm * ((100 - ARRIVAL_RESERVE_PERCENT) / 100);
  const previousLegRangeKm = stopIndex === 0
    ? plan.carRangeKm * (Math.max(0, plan.currentChargePercent - ARRIVAL_RESERVE_PERCENT) / 100)
    : safeRangeKm;
  const prefixStationIds = plan.stops
    .slice(0, stopIndex)
    .map((stop) => stop.station.id);
  const options = reachableChargingOptions(
    plan.chargingCandidates,
    previousProgressKm,
    previousLegRangeKm,
    prefixStationIds,
  );

  if (!options.some((candidate) => candidate.station.id === currentStop.station.id)) {
    options.push(plan.chargingCandidates.find((candidate) => candidate.station.id === currentStop.station.id) || {
      station: currentStop.station,
      coordinates: currentStop.coordinates,
      progressKm: currentStop.progressKm,
      corridorKm: 0,
    });
    options.sort((first, second) => first.progressKm - second.progressKm);
  }

  return options;
}

function ChargingItineraryCard({
  plan,
  startName,
  destinationName,
  changingStopIndex,
  stopError,
  onStopChange,
}: {
  plan: TripPlan;
  startName: string;
  destinationName: string;
  changingStopIndex: number | null;
  stopError: string | null;
  onStopChange: (index: number, stationId: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="text-xl font-bold text-foreground">Your charging itinerary</h2>
      <p className="mt-1 text-xs leading-5 text-muted">
        Safe stops are selected automatically. Each selector shows every charger reachable from the previous point. If you choose an earlier stop, the remaining stops are recalculated automatically. The smallest planned reserve is about {Math.round(plan.reserveRangeKm)} km. Charging time is not included.
      </p>

      {stopError ? (
        <p role="alert" className="mt-3 rounded-xl border border-border bg-background p-3 text-sm leading-6 text-foreground">{stopError}</p>
      ) : null}

      <ol className="mt-4 grid gap-3">
        <ItineraryPoint
          title={startName}
          subtitle={`Start with ${plan.currentChargePercent}% battery`}
          index={1}
        />
        {plan.stops.map((stop, index) => {
          const nextLeg = plan.stops[index + 1]?.arrivalLeg || plan.finalLeg;
          const chargeTarget = chargeNeededForLeg(nextLeg, plan.carRangeKm).recommendedPercent;
          const neededForArrival = chargeNeededForLeg(stop.arrivalLeg, plan.carRangeKm).recommendedPercent;
          const departureCharge = index === 0
            ? Math.max(plan.currentChargePercent, neededForArrival)
            : neededForArrival;
          const arrivalCharge = plannedArrivalPercent(
            stop.arrivalLeg,
            plan.carRangeKm,
            departureCharge,
          );
          const alternatives = stopAlternatives(plan, index);

          return (
            <ItineraryPoint
              key={stop.station.id}
              title={stop.station.name}
              subtitle={`${stop.arrivalLeg.distance?.text || "Distance unavailable"} drive - arrive near ${arrivalCharge}% - charge to ${chargeTarget}% before continuing`}
              address={stop.station.address}
              index={index + 2}
              controls={alternatives.length > 1 ? (
                <div className="mt-3 border-t border-border pt-3">
                  <label htmlFor={`charging-stop-${index}`} className="text-xs font-semibold text-foreground">
                    Choose charging stop {index + 1}
                  </label>
                  <select
                    id={`charging-stop-${index}`}
                    value={stop.station.id}
                    disabled={changingStopIndex !== null}
                    onChange={(event) => onStopChange(index, event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-foreground disabled:cursor-wait disabled:opacity-60"
                  >
                    {alternatives.map((candidate) => (
                      <option key={candidate.station.id} value={candidate.station.id}>
                        {candidate.station.name} · near {Math.round(candidate.progressKm)} km
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[0.68rem] leading-5 text-muted">
                    {changingStopIndex === index ? "Checking the new route..." : `${alternatives.length} reachable options for this leg.`}
                  </p>
                </div>
              ) : null}
            />
          );
        })}
        <ItineraryPoint
          title={destinationName}
          subtitle={`${plan.finalLeg.distance?.text || "Distance unavailable"} final leg - arrive near ${plannedArrivalPercent(
            plan.finalLeg,
            plan.carRangeKm,
            plan.stops.length
              ? chargeNeededForLeg(plan.finalLeg, plan.carRangeKm).recommendedPercent
              : Math.max(
                  plan.currentChargePercent,
                  chargeNeededForLeg(plan.finalLeg, plan.carRangeKm).recommendedPercent,
                ),
          )}%`}
          index={plan.stops.length + 2}
          destination
        />
      </ol>

      <div className="mt-5 border-t border-border pt-5">
        <ButtonLink
          href={googleMapsTripUrl(plan)}
          external
          className="min-h-12 w-full rounded-xl text-base sm:w-full"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <GoogleMapsIcon />
            <span>Get Directions</span>
          </span>
        </ButtonLink>
        {plan.stops.length > 3 ? (
          <p className="mt-2 text-center text-xs leading-5 text-muted">
            Some mobile browsers support only the first three Google Maps waypoints.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function DepartureAdvice({ plan, destinationName }: { plan: TripPlan; destinationName: string }) {
  const firstLeg = plan.stops[0]?.arrivalLeg || plan.finalLeg;
  const firstTarget = plan.stops[0]?.station.name || destinationName;
  const firstLegKm = legDistanceKm(firstLeg);
  const availableRangeKm = plan.carRangeKm * (plan.currentChargePercent / 100);
  const { minimumPercent, recommendedPercent } = chargeNeededForLeg(firstLeg, plan.carRangeKm);
  const additionalCharge = Math.max(0, recommendedPercent - plan.currentChargePercent);
  const directTrip = plan.stops.length === 0;
  let title: string;
  let message: string;

  if (plan.currentChargePercent >= recommendedPercent) {
    title = directTrip ? "You can reach without charging" : "You can reach the first charger";
    message = directTrip
      ? `Your ${plan.currentChargePercent}% battery gives about ${Math.round(availableRangeKm)} km of range. The destination is ${Math.round(firstLegKm)} km away, so you can arrive with at least ${ARRIVAL_RESERVE_PERCENT}% remaining.`
      : `Your ${plan.currentChargePercent}% battery is enough to reach ${firstTarget}, ${Math.round(firstLegKm)} km away, without falling below the ${ARRIVAL_RESERVE_PERCENT}% arrival reserve.`;
  } else if (plan.currentChargePercent >= minimumPercent) {
    title = `Reachable, but below the ${ARRIVAL_RESERVE_PERCENT}% reserve`;
    message = `You can technically reach ${firstTarget}, but charge to ${recommendedPercent}% before leaving to arrive at or just above ${ARRIVAL_RESERVE_PERCENT}%. Add about ${additionalCharge} percentage points.`;
  } else {
    title = "Charge before leaving";
    message = `Your current ${plan.currentChargePercent}% gives about ${Math.round(availableRangeKm)} km. Charge to ${recommendedPercent}% before leaving so you can cover the ${Math.round(firstLegKm)} km leg and arrive with at least ${ARRIVAL_RESERVE_PERCENT}%. Add approximately ${additionalCharge} percentage points.`;
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Departure check</p>
      <h2 className="mt-1 text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <ChargeMetric label="Current" value={`${plan.currentChargePercent}%`} />
        <ChargeMetric label="Minimum" value={`${minimumPercent}%`} />
        <ChargeMetric label="Leave with" value={`${recommendedPercent}%`} />
      </div>
      {!directTrip ? (
        <p className="mt-3 text-xs font-medium text-foreground">
          This trip cannot be completed without charging; {plan.stops.length} charging stop{plan.stops.length === 1 ? " is" : "s are"} planned.
        </p>
      ) : null}
    </div>
  );
}

function ChargeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-secondary px-2 py-2.5 text-center">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function TripMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-center">
      <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function GoogleMapsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path fill="#34a853" d="M12 22s7-6.1 7-13A7 7 0 0 0 5 9c0 6.9 7 13 7 13Z" />
      <path fill="#4285f4" d="M12 12.5A3.5 3.5 0 0 0 15.5 9H19c0 6.9-7 13-7 13v-9.5Z" opacity="0.9" />
      <path fill="#fbbc04" d="M5 9a7 7 0 0 1 7-7v7H5Z" />
      <path fill="#ea4335" d="M12 2a7 7 0 0 1 7 7h-7V2Z" />
      <circle cx="12" cy="9" r="2.4" fill="#fff" />
    </svg>
  );
}

function ItineraryPoint({
  title,
  subtitle,
  address,
  index,
  destination,
  controls,
}: {
  title: string;
  subtitle: string;
  address?: string | null;
  index: number;
  destination?: boolean;
  controls?: ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-border bg-background p-3">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${destination ? "bg-foreground text-secondary" : "bg-primary text-secondary"}`}>
        {index}
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {address ? <p className="mt-1 text-xs leading-5 text-muted">{address}</p> : null}
        <p className="mt-1 text-xs font-medium text-primary">{subtitle}</p>
        {controls}
      </div>
    </li>
  );
}
