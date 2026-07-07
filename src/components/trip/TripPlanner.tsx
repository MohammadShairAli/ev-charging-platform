"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap } from "@/src/components/map/GoogleMap";
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
};

type TripPlan = {
  source: "google" | "demo";
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
};

type TripPlannerProps = {
  stations: Station[];
};

const MAX_CHARGING_STOPS = 8;
const ARRIVAL_RESERVE_PERCENT = 15;
const DEMO_CAR_RANGE_KM = 300;
const TRIP_RESULT_QUERY_KEY = "result";
const TRIP_RESULT_QUERY_VALUE = "1";
const LAHORE_COORDINATES = { lat: 31.5204, lng: 74.3587 } satisfies LatLngLiteral;
const ISLAMABAD_COORDINATES = { lat: 33.6844, lng: 73.0479 } satisfies LatLngLiteral;
const DEMO_ROUTE_PATH: LatLngLiteral[] = [
  LAHORE_COORDINATES,
  { lat: 31.633, lng: 74.217 },
  { lat: 31.737, lng: 73.95 },
  { lat: 31.898, lng: 73.274 },
  { lat: 32.2, lng: 73.08 },
  { lat: 32.482, lng: 72.908 },
  { lat: 32.779, lng: 72.697 },
  { lat: 33.145, lng: 72.72 },
  { lat: 33.43, lng: 72.86 },
  ISLAMABAD_COORDINATES,
];
const DEMO_STATIONS: Station[] = [
  {
    id: "demo-pindi-bhattian-m2",
    google_place_id: null,
    name: "Pindi Bhattian M-2 Demo Charger",
    address: "Pindi Bhattian Service Area, M-2 Motorway",
    latitude: 31.898,
    longitude: 73.274,
    phone: null,
    website: null,
    rating: null,
    operator: "Demo charging stop",
    created_at: null,
    updated_at: null,
  },
  {
    id: "demo-bhera-m2",
    google_place_id: null,
    name: "Bhera M-2 Demo Charger",
    address: "Bhera Service Area, M-2 Motorway",
    latitude: 32.482,
    longitude: 72.908,
    phone: null,
    website: null,
    rating: null,
    operator: "Demo charging stop",
    created_at: null,
    updated_at: null,
  },
  {
    id: "demo-kallar-kahar-m2",
    google_place_id: null,
    name: "Kallar Kahar M-2 Demo Charger",
    address: "Kallar Kahar Service Area, M-2 Motorway",
    latitude: 32.779,
    longitude: 72.697,
    phone: null,
    website: null,
    rating: null,
    operator: "Demo charging stop",
    created_at: null,
    updated_at: null,
  },
];
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${appConfig.google.mapsApiKey}&callback=initTripPlannerMaps&loading=async`;
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
  const checkpointGapKm = Math.max(40, carRangeKm * 0.72);
  const checkpoints: LatLngLiteral[] = [];

  for (
    let distanceKm = checkpointGapKm;
    distanceKm < totalDistanceKm && checkpoints.length < MAX_CHARGING_STOPS;
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

function chooseChargingStops(
  candidates: ChargingCandidate[],
  totalDistanceKm: number,
  carRangeKm: number,
  currentChargePercent: number,
) {
  const fullChargeDrivingBudgetKm = carRangeKm * ((100 - ARRIVAL_RESERVE_PERCENT) / 100);
  const stops: ChargingCandidate[] = [];
  let currentProgressKm = 0;
  let drivingBudgetKm = carRangeKm * (Math.max(0, currentChargePercent - ARRIVAL_RESERVE_PERCENT) / 100);
  let planningFirstLeg = true;

  while (totalDistanceKm - currentProgressKm > drivingBudgetKm) {
    const reachable = candidates
      .filter((candidate) => (
        candidate.progressKm > currentProgressKm + 5 &&
        candidate.progressKm <= currentProgressKm + drivingBudgetKm &&
        !stops.some((stop) => stop.station.id === candidate.station.id)
      ))
      .sort((first, second) => (
        second.progressKm - first.progressKm || first.corridorKm - second.corridorKm
      ));
    let nextStop = reachable[0];

    if (!nextStop && planningFirstLeg) {
      nextStop = candidates
        .filter((candidate) => (
          candidate.progressKm > currentProgressKm + 5 &&
          candidate.progressKm <= currentProgressKm + fullChargeDrivingBudgetKm
        ))
        .sort((first, second) => (
          first.progressKm - second.progressKm || first.corridorKm - second.corridorKm
        ))[0];
    }

    if (!nextStop) {
      throw new Error(
        `No charging station was found that keeps at least ${ARRIVAL_RESERVE_PERCENT}% battery on every leg. Try a larger range or a different route.`,
      );
    }

    stops.push(nextStop);
    currentProgressKm = nextStop.progressKm;
    drivingBudgetKm = fullChargeDrivingBudgetKm;
    planningFirstLeg = false;

    if (stops.length >= MAX_CHARGING_STOPS && totalDistanceKm - currentProgressKm > drivingBudgetKm) {
      throw new Error("This trip needs more charging stops than the planner currently supports.");
    }
  }

  return stops;
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

function demoLeg(
  start: LatLngLiteral,
  destination: LatLngLiteral,
  distanceKm: number,
  durationMinutes: number,
): GoogleDirectionsLeg {
  return {
    distance: { text: `${distanceKm} km`, value: distanceKm * 1000 },
    duration: { text: formatDuration(durationMinutes * 60), value: durationMinutes * 60 },
    start_location: routePoint(start),
    end_location: routePoint(destination),
  };
}

function demoRouteDirection(start: string, end: string) {
  const normalizedStart = start.trim().toLowerCase();
  const normalizedEnd = end.trim().toLowerCase();

  if (normalizedStart.includes("lahore") && normalizedEnd.includes("islamabad")) {
    return "lahore-islamabad" as const;
  }

  if (normalizedStart.includes("islamabad") && normalizedEnd.includes("lahore")) {
    return "islamabad-lahore" as const;
  }

  return null;
}

function buildDemoTripPlan(
  start: string,
  end: string,
  carRangeKm: number,
  currentChargePercent: number,
): TripPlan | null {
  const direction = demoRouteDirection(start, end);

  if (!direction) {
    return null;
  }

  const forward = direction === "lahore-islamabad";
  const stations = forward ? DEMO_STATIONS : [...DEMO_STATIONS].reverse();
  const stationProgressKm = forward ? [145, 230, 310] : [65, 145, 230];
  const candidates = stations.map((station, index) => ({
    station,
    coordinates: stationCoordinates(station)!,
    progressKm: stationProgressKm[index],
    corridorKm: 0,
  }));
  const selectedStops = chooseChargingStops(
    candidates,
    375,
    carRangeKm,
    currentChargePercent,
  );
  const origin = forward ? LAHORE_COORDINATES : ISLAMABAD_COORDINATES;
  const destination = forward ? ISLAMABAD_COORDINATES : LAHORE_COORDINATES;
  const points = [origin, ...selectedStops.map((stop) => stop.coordinates), destination];
  const progressPoints = [0, ...selectedStops.map((stop) => stop.progressKm), 375];
  const distancesKm = progressPoints.slice(1).map((progress, index) => progress - progressPoints[index]);
  const durationsMinutes = distancesKm.map((distanceKm) => Math.round((distanceKm / 82) * 60));
  const legs = distancesKm.map((distanceKm, index) => (
    demoLeg(points[index], points[index + 1], distanceKm, durationsMinutes[index])
  ));

  return {
    source: "demo",
    origin,
    destination,
    routePath: forward ? DEMO_ROUTE_PATH : [...DEMO_ROUTE_PATH].reverse(),
    stops: selectedStops.map((stop, index) => ({
      station: stop.station,
      coordinates: stop.coordinates,
      arrivalLeg: legs[index],
    })),
    finalLeg: legs.at(-1)!,
    totalDistanceKm: distancesKm.reduce((total, distance) => total + distance, 0),
    totalDurationSeconds: durationsMinutes.reduce((total, duration) => total + duration, 0) * 60,
    reserveRangeKm: carRangeKm * (ARRIVAL_RESERVE_PERCENT / 100),
    carRangeKm,
    currentChargePercent,
  };
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

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    const query = value.trim();

    if (query.length < 2 || !appConfig.google.mapsApiKey) {
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
      onPlaceSelect(selectedValue, toLiteral(place.location));
    } catch {
      skipNextSearchRef.current = true;
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

          if (nextValue.trim().length < 2) {
            requestIdRef.current += 1;
            setSuggestions([]);
            setSuggestionError(null);
            setIsOpen(false);
          }

          onValueChange(nextValue);
        }}
        onFocus={() => setIsOpen(Boolean(suggestions.length || suggestionError))}
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
  const [rangeKm, setRangeKm] = useState("");
  const [currentChargePercent, setCurrentChargePercent] = useState("100");
  const [usingSavedRange, setUsingSavedRange] = useState(false);
  const [loading, setLoading] = useState(false);
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
        setUsingSavedRange(true);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedRange = Number(rangeKm);
    const parsedCurrentCharge = Number(currentChargePercent);

    if (!start.trim() || !end.trim()) {
      setError("Enter both a starting point and a destination.");
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
        car: { ...profile.car, rangeKm: parsedRange },
      };
      const draft: StoredTripDraft = {
        start: start.trim(),
        end: end.trim(),
        rangeKm: parsedRange,
        currentChargePercent: parsedCurrentCharge,
      };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
      localStorage.setItem(TRIP_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setUsingSavedRange(true);

      if (!appConfig.google.mapsApiKey) {
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
      const overRangeLeg = finalLegs.find((leg) => (leg.distance?.value || 0) / 1000 > safeLegRangeKm);

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
        })),
        finalLeg: finalLegs.at(-1)!,
        totalDistanceKm: routeDistanceKm(finalLegs),
        totalDurationSeconds: routeDurationSeconds(finalLegs),
        reserveRangeKm: parsedRange * (ARRIVAL_RESERVE_PERCENT / 100),
        carRangeKm: parsedRange,
        currentChargePercent: parsedCurrentCharge,
      });
    } catch (caughtError) {
      try {
        const demoPlan = buildDemoTripPlan(start, end, parsedRange, parsedCurrentCharge);

        if (demoPlan) {
          openResultsView(demoPlan);
          setError(null);
        } else {
          setError(googleApiErrorMessage(caughtError));
        }
      } catch (demoError) {
        setError(demoError instanceof Error ? demoError.message : googleApiErrorMessage(caughtError));
      }
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

  function loadDemoDirection(origin: "Lahore" | "Islamabad", destination: "Lahore" | "Islamabad") {
    setStart(origin);
    setEnd(destination);
    setStartLocation(null);
    setEndLocation(null);
    setRangeKm(String(DEMO_CAR_RANGE_KM));
    setUsingSavedRange(false);
    setPlan(null);
    setError(null);
  }

  if (isResultsView && plan) {
    return (
      <div className="mx-auto grid max-w-5xl gap-4">
        <div className="grid justify-items-start gap-3">
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

        {plan.source === "demo" ? (
          <div role="status" className="rounded-2xl border border-primary/40 bg-surface p-4 text-sm leading-6 text-foreground">
            <p className="font-bold text-primary">Demo route active</p>
            <p className="mt-1 text-muted">
              Google routing is unavailable, so this Lahore-Islamabad itinerary uses sample distances and charging stops. Verify chargers and road conditions before travelling.
            </p>
          </div>
        ) : null}

        <GoogleMap
          stations={mapStations}
          center={plan.origin}
          routeOrigin={plan.origin}
          routeDestination={plan.destination}
          routePath={plan.routePath}
          className="min-h-[22rem]"
        />

        <TripSummaryCard plan={plan} destinationName={end} />
        <ChargingItineraryCard plan={plan} startName={start} destinationName={end} />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <p className="text-sm font-semibold text-primary">Plan my trip</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Build a charging route</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Enter your journey and the planner will place verified charging stops before your battery range runs out.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <fieldset className="rounded-2xl border border-border bg-background p-2">
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

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted">Try demo:</span>
            <button
              type="button"
              onClick={() => loadDemoDirection("Lahore", "Islamabad")}
              className="rounded-full border border-border bg-secondary px-3 py-2 font-semibold text-foreground transition hover:border-primary hover:text-primary"
            >
              Lahore → Islamabad
            </button>
            <button
              type="button"
              onClick={() => loadDemoDirection("Islamabad", "Lahore")}
              className="rounded-full border border-border bg-secondary px-3 py-2 font-semibold text-foreground transition hover:border-primary hover:text-primary"
            >
              Islamabad → Lahore
            </button>
          </div>

          {usingSavedRange ? (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Car range from profile</p>
                <p className="mt-1 text-lg font-bold text-foreground">{rangeKm} km per full charge</p>
              </div>
              <button
                type="button"
                onClick={() => setUsingSavedRange(false)}
                className="min-h-10 rounded-lg border border-border bg-secondary px-3 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
              >
                Change
              </button>
            </div>
          ) : (
            <div>
              <label htmlFor="car-range" className="text-sm font-semibold text-foreground">Range per full charge</label>
              <div className="relative mt-2">
                <input
                  id="car-range"
                  type="number"
                  min="30"
                  max="1200"
                  step="1"
                  value={rangeKm}
                  onChange={(event) => setRangeKm(event.target.value)}
                  placeholder="200"
                  className="min-h-12 w-full rounded-xl border border-border bg-secondary px-4 pr-14 text-base text-foreground placeholder:text-muted/70"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-muted">km</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">This range will be saved locally for your profile and future trips.</p>
            </div>
          )}

          <div>
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
            <div role="alert" className="rounded-xl border border-border bg-background p-3 text-sm leading-6 text-foreground">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-secondary transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"
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

      <section className="min-w-0">
        {loading ? (
          <TripPlanningLoader />
        ) : null}
      </section>
    </div>
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
    </section>
  );
}

function ChargingItineraryCard({
  plan,
  startName,
  destinationName,
}: {
  plan: TripPlan;
  startName: string;
  destinationName: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="text-xl font-bold text-foreground">Your charging itinerary</h2>
      <p className="mt-1 text-xs leading-5 text-muted">
        Stops are selected as close as possible to a {ARRIVAL_RESERVE_PERCENT}% arrival charge without going below it. The smallest planned reserve is about {Math.round(plan.reserveRangeKm)} km. Charging time is not included.
      </p>

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

          return (
            <ItineraryPoint
              key={stop.station.id}
              title={stop.station.name}
              subtitle={`${stop.arrivalLeg.distance?.text || "Distance unavailable"} drive - arrive near ${arrivalCharge}% - charge to ${chargeTarget}% before continuing`}
              address={stop.station.address}
              index={index + 2}
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
}: {
  title: string;
  subtitle: string;
  address?: string | null;
  index: number;
  destination?: boolean;
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
      </div>
    </li>
  );
}
