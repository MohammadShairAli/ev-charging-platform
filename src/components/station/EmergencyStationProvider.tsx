"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { DirectionsResult, LatLngLiteral, Station } from "@/src/types";
import { calculateDistanceKm } from "@/src/utils/distance";
import { stationCoordinates } from "@/src/utils/station";
import { isLikelyChargingStation } from "@/src/utils/station-quality";

export type ClosestStation = {
  station: Station;
  coordinates: LatLngLiteral;
  directDistanceKm: number;
};

type NearbyStatus = "loading" | "idle" | "unavailable";

type EmergencyStationData = {
  origin: LatLngLiteral | null;
  locationLabel: string | null;
  nearbyStations: Station[] | null;
  nearbyStatus: NearbyStatus;
  closest: ClosestStation | null;
  directions: DirectionsResult;
  directionsReady: boolean;
  isDesktop: boolean | null;
  handleRouteResolved: (route: { distanceText: string; durationText: string }) => void;
};

type ResolvedOrigin = {
  origin: LatLngLiteral;
  locationLabel: string;
};

const defaultDirections: DirectionsResult = {
  distanceText: "Distance unavailable",
  durationText: "ETA unavailable",
  polyline: null,
};

const EmergencyStationContext = createContext<EmergencyStationData | null>(null);
let originRequest: Promise<ResolvedOrigin> | null = null;
const nearbyRequests = new Map<string, Promise<Station[]>>();
const directionsRequests = new Map<string, Promise<DirectionsResult>>();

function resolveOrigin(fallbackOrigin: LatLngLiteral) {
  if (originRequest) {
    return originRequest;
  }

  originRequest = new Promise((resolve) => {
    const useFallback = () => resolve({
      origin: fallbackOrigin,
      locationLabel: "Estimated from Lahore Gulberg",
    });

    if (!navigator.geolocation) {
      useFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        origin: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        locationLabel: "Using your current location",
      }),
      useFallback,
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 8000,
      },
    );
  });

  return originRequest;
}

function loadNearbyStations(origin: LatLngLiteral) {
  const key = `${origin.lat},${origin.lng}`;
  const existingRequest = nearbyRequests.get(key);

  if (existingRequest) {
    return existingRequest;
  }

  const params = new URLSearchParams({
    lat: String(origin.lat),
    lng: String(origin.lng),
    sort: "distance",
  });
  const request = fetch(`/api/stations?${params.toString()}`)
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((data: { stations?: Station[] }) => data.stations || []);

  nearbyRequests.set(key, request);
  return request;
}

function loadDirections(origin: LatLngLiteral, closest: ClosestStation) {
  const destination = closest.coordinates;
  const key = `${origin.lat},${origin.lng}:${destination.lat},${destination.lng}`;
  const existingRequest = directionsRequests.get(key);

  if (existingRequest) {
    return existingRequest;
  }

  const fallbackDirections: DirectionsResult = {
    distanceText: `${closest.directDistanceKm.toFixed(1)} km`,
    durationText: "ETA unavailable",
    polyline: null,
  };
  const request = fetch("/api/directions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination }),
  })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((data: { directions?: DirectionsResult }) => data.directions || fallbackDirections)
    .catch(() => fallbackDirections);

  directionsRequests.set(key, request);
  return request;
}

function findClosestStation(stations: Station[], origin: LatLngLiteral): ClosestStation | null {
  return stations.reduce<ClosestStation | null>((closest, station) => {
    if (!isLikelyChargingStation(station)) {
      return closest;
    }

    const coordinates = stationCoordinates(station);

    if (!coordinates) {
      return closest;
    }

    const directDistanceKm = calculateDistanceKm(origin, coordinates);
    return !closest || directDistanceKm < closest.directDistanceKm
      ? { station, coordinates, directDistanceKm }
      : closest;
  }, null);
}

export function EmergencyStationProvider({
  children,
  stations,
  fallbackOrigin,
}: {
  children: ReactNode;
  stations: Station[];
  fallbackOrigin: LatLngLiteral;
}) {
  const [origin, setOrigin] = useState<LatLngLiteral | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [nearbyStations, setNearbyStations] = useState<Station[] | null>(null);
  const [nearbyStatus, setNearbyStatus] = useState<NearbyStatus>("loading");
  const [directions, setDirections] = useState<DirectionsResult>(defaultDirections);
  const [directionsStationId, setDirectionsStationId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const closest = useMemo(
    () => origin && nearbyStations ? findClosestStation(nearbyStations, origin) : null,
    [nearbyStations, origin],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const updateViewport = () => setIsDesktop(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    let cancelled = false;

    resolveOrigin(fallbackOrigin)
      .then((resolved) => {
        if (cancelled) {
          return null;
        }

        setOrigin(resolved.origin);
        setLocationLabel(resolved.locationLabel);
        return loadNearbyStations(resolved.origin);
      })
      .then((resolvedStations) => {
        if (cancelled || !resolvedStations) {
          return;
        }

        setNearbyStations(resolvedStations.length ? resolvedStations : stations);
        setNearbyStatus(resolvedStations.length ? "idle" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) {
          setNearbyStations(stations);
          setNearbyStatus("unavailable");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackOrigin, stations]);

  useEffect(() => {
    if (!origin || !closest) {
      return;
    }

    let cancelled = false;
    loadDirections(origin, closest).then((resolvedDirections) => {
      if (!cancelled) {
        setDirections(resolvedDirections);
        setDirectionsStationId(closest.station.id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [closest, origin]);

  const value = useMemo<EmergencyStationData>(() => ({
    origin,
    locationLabel,
    nearbyStations,
    nearbyStatus,
    closest,
    directions,
    directionsReady: !closest || directionsStationId === closest.station.id,
    isDesktop,
    handleRouteResolved: (route) => setDirections((current) => ({ ...current, ...route })),
  }), [closest, directions, directionsStationId, isDesktop, locationLabel, nearbyStations, nearbyStatus, origin]);

  return <EmergencyStationContext.Provider value={value}>{children}</EmergencyStationContext.Provider>;
}

export function useEmergencyStationData() {
  const context = useContext(EmergencyStationContext);

  if (!context) {
    throw new Error("Emergency station components must be inside EmergencyStationProvider.");
  }

  return context;
}

export function useOptionalEmergencyStationData() {
  return useContext(EmergencyStationContext);
}
