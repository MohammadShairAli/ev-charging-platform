"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { GoogleMap } from "@/src/components/map/GoogleMap";
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
  start_address?: string;
  end_address?: string;
  start_location?: GoogleLatLng;
  end_location?: GoogleLatLng;
};

type GoogleDirectionsRoute = {
  overview_path?: GoogleLatLng[];
  legs?: GoogleDirectionsLeg[];
};

type GoogleDirectionsResult = {
  routes?: GoogleDirectionsRoute[];
};

type GoogleDirectionsService = {
  route: (request: {
    origin: string | LatLngLiteral;
    destination: string | LatLngLiteral;
    travelMode: string;
    waypoints?: Array<{ location: LatLngLiteral; stopover: boolean }>;
    optimizeWaypoints?: boolean;
  }) => Promise<GoogleDirectionsResult>;
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
};

type LegacyGooglePlace = {
  place_id?: string;
  name?: string;
  vicinity?: string;
  rating?: number;
  geometry?: { location?: GoogleLatLng };
};

type TripGoogleMaps = {
  DirectionsService: new () => GoogleDirectionsService;
  TravelMode: { DRIVING: string };
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
let mapsLoadingPromise: Promise<TripGoogleMaps> | null = null;

function loadGoogleMaps() {
  const tripWindow = window as TripWindow;

  if (tripWindow.google?.maps?.DirectionsService) {
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

function chooseChargingStops(candidates: ChargingCandidate[], totalDistanceKm: number, carRangeKm: number) {
  const preferredRangeKm = carRangeKm * 0.9;
  const stops: ChargingCandidate[] = [];
  let currentProgressKm = 0;

  while (totalDistanceKm - currentProgressKm > carRangeKm) {
    const reachable = candidates
      .filter((candidate) => (
        candidate.progressKm > currentProgressKm + 5 &&
        candidate.progressKm <= currentProgressKm + carRangeKm &&
        !stops.some((stop) => stop.station.id === candidate.station.id)
      ))
      .sort((first, second) => (
        second.progressKm - first.progressKm || first.corridorKm - second.corridorKm
      ));
    const nextStop = reachable.find((candidate) => candidate.progressKm <= currentProgressKm + preferredRangeKm) || reachable[0];

    if (!nextStop) {
      throw new Error(
        `No verified charging station was found within the car's ${Math.round(carRangeKm)} km range. Try a larger range or a different route.`,
      );
    }

    stops.push(nextStop);
    currentProgressKm = nextStop.progressKm;

    if (stops.length >= MAX_CHARGING_STOPS && totalDistanceKm - currentProgressKm > carRangeKm) {
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
  const recommendedPercent = Math.min(100, Math.ceil((exactPercent + 5) / 5) * 5);

  return { minimumPercent, recommendedPercent };
}

export function TripPlanner({ stations }: TripPlannerProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rangeKm, setRangeKm] = useState("");
  const [currentChargePercent, setCurrentChargePercent] = useState("100");
  const [usingSavedRange, setUsingSavedRange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<TripPlan | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const profile = readStoredProfile();
      const draft = readTripDraft();
      const savedRange = profile.car?.rangeKm;

      setStart(draft.start || "");
      setEnd(draft.end || "");

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

  const mapStations = useMemo(() => plan?.stops.map((stop) => stop.station) || [], [plan]);

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

    if (!appConfig.google.mapsApiKey) {
      setError("Add a Google Maps API key before planning a trip.");
      return;
    }

    setLoading(true);
    setError(null);
    setPlan(null);

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

      const maps = await loadGoogleMaps();
      const directionsService = new maps.DirectionsService();
      const initialResult = await directionsService.route({
        origin: start.trim(),
        destination: end.trim(),
        travelMode: maps.TravelMode.DRIVING,
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
      const stops = chooseChargingStops(candidates, totalDistanceKm, parsedRange);
      const finalResult = stops.length
        ? await directionsService.route({
            origin: start.trim(),
            destination: end.trim(),
            waypoints: stops.map((stop) => ({ location: stop.coordinates, stopover: true })),
            optimizeWaypoints: false,
            travelMode: maps.TravelMode.DRIVING,
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

      const overRangeLeg = finalLegs.find((leg) => (leg.distance?.value || 0) / 1000 > parsedRange);

      if (overRangeLeg) {
        throw new Error(
          `A route leg is ${overRangeLeg.distance?.text || "longer than expected"}, which exceeds the car's saved range. A safe plan could not be verified.`,
        );
      }

      const minimumReserveKm = Math.min(
        ...finalLegs.map((leg) => parsedRange - (leg.distance?.value || 0) / 1000),
      );

      setPlan({
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
        reserveRangeKm: Math.max(0, minimumReserveKm),
        carRangeKm: parsedRange,
        currentChargePercent: parsedCurrentCharge,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The trip could not be planned.");
    } finally {
      setLoading(false);
    }
  }

  function swapLocations() {
    setStart(end);
    setEnd(start);
    setPlan(null);
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
            <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] grid-rows-2 overflow-hidden rounded-xl border border-border bg-secondary">
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

              <label htmlFor="trip-start" className="col-start-2 row-start-1 flex min-w-0 flex-col justify-center border-b border-border px-2 py-2 focus-within:bg-background">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">From</span>
                <input
                  id="trip-start"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  placeholder="Enter starting point"
                  autoComplete="street-address"
                  className="mt-0.5 min-h-8 w-full bg-transparent text-base font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted/70"
                />
              </label>

              <label htmlFor="trip-end" className="col-start-2 row-start-2 flex min-w-0 flex-col justify-center px-2 py-2 focus-within:bg-background">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">To</span>
                <input
                  id="trip-end"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  placeholder="Enter destination"
                  autoComplete="street-address"
                  className="mt-0.5 min-h-8 w-full bg-transparent text-base font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted/70"
                />
              </label>

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
            {loading ? "Finding safe charging stops..." : "Make my trip"}
          </button>
        </form>
      </section>

      <section className="min-w-0">
        {plan ? (
          <div className="grid gap-4">
            <GoogleMap
              stations={mapStations}
              center={plan.origin}
              routeOrigin={plan.origin}
              routeDestination={plan.destination}
              routePath={plan.routePath}
              className="min-h-[22rem]"
            />

            <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <DepartureAdvice plan={plan} destinationName={end} />

              <div className="grid grid-cols-3 gap-2">
                <TripMetric label="Distance" value={`${Math.round(plan.totalDistanceKm)} km`} />
                <TripMetric label="Drive time" value={formatDuration(plan.totalDurationSeconds)} />
                <TripMetric label="Charge stops" value={String(plan.stops.length)} />
              </div>

              <div className="mt-5 border-t border-border pt-5">
                <h2 className="text-xl font-bold text-foreground">Your charging itinerary</h2>
                <p className="mt-1 text-xs leading-5 text-muted">
                  A {Math.round(plan.reserveRangeKm)} km reserve is kept on each planned leg. Charging time is not included in drive time.
                </p>

                <ol className="mt-4 grid gap-3">
                  <ItineraryPoint
                    title={start}
                    subtitle={`Start with ${plan.currentChargePercent}% battery`}
                    index={1}
                  />
                  {plan.stops.map((stop, index) => {
                    const nextLeg = plan.stops[index + 1]?.arrivalLeg || plan.finalLeg;
                    const chargeTarget = chargeNeededForLeg(nextLeg, plan.carRangeKm).recommendedPercent;

                    return (
                      <ItineraryPoint
                        key={stop.station.id}
                        title={stop.station.name}
                        subtitle={`${stop.arrivalLeg.distance?.text || "Distance unavailable"} drive - charge to at least ${chargeTarget}% before continuing`}
                        address={stop.station.address}
                        index={index + 2}
                      />
                    );
                  })}
                  <ItineraryPoint
                    title={end}
                    subtitle={`${plan.finalLeg.distance?.text || "Distance unavailable"} final leg - destination`}
                    index={plan.stops.length + 2}
                    destination
                  />
                </ol>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[28rem] place-items-center rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
            <div className="max-w-sm">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-border bg-background text-primary">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                  <circle cx="6" cy="18" r="2.5" />
                  <circle cx="18" cy="6" r="2.5" />
                  <path d="M8.5 18h2.2a3 3 0 0 0 3-3v-6a3 3 0 0 1 3-3h.8" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground">Your route will appear here</h2>
              <p className="mt-2 text-sm leading-6 text-muted">The map will show the road route and every charging stop needed for your car.</p>
            </div>
          </div>
        )}
      </section>
    </div>
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
      ? `Your ${plan.currentChargePercent}% battery gives about ${Math.round(availableRangeKm)} km of range. The destination is ${Math.round(firstLegKm)} km away, so no charging stop is needed.`
      : `Your ${plan.currentChargePercent}% battery is enough to reach ${firstTarget}, ${Math.round(firstLegKm)} km away. You will need to charge there before continuing.`;
  } else if (plan.currentChargePercent >= minimumPercent) {
    title = "Reachable, but the battery reserve is low";
    message = `You can technically reach ${firstTarget} with ${minimumPercent}%, but ${recommendedPercent}% is recommended. Add about ${additionalCharge} percentage points before leaving.`;
  } else {
    title = "Charge before leaving";
    message = `Your current ${plan.currentChargePercent}% gives about ${Math.round(availableRangeKm)} km. To reach ${firstTarget}, ${Math.round(firstLegKm)} km away, you need at least ${minimumPercent}%; charge to about ${recommendedPercent}% for a safer reserve. That means adding approximately ${additionalCharge} percentage points.`;
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Departure check</p>
      <h2 className="mt-1 text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <ChargeMetric label="Current" value={`${plan.currentChargePercent}%`} />
        <ChargeMetric label="Minimum" value={`${minimumPercent}%`} />
        <ChargeMetric label="Recommended" value={`${recommendedPercent}%`} />
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
