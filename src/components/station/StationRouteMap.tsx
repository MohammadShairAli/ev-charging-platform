"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleMap } from "@/src/components/map/GoogleMap";
import type { LatLngLiteral, Station } from "@/src/types";
import { stationCoordinates } from "@/src/utils/station";

export function StationRouteMap({
  station,
  fallbackOrigin,
}: {
  station: Station;
  fallbackOrigin: LatLngLiteral;
}) {
  const [origin, setOrigin] = useState<LatLngLiteral | null>(null);
  const [locationLabel, setLocationLabel] = useState("Finding your location");
  const [routeSummary, setRouteSummary] = useState<{ distanceText: string; durationText: string } | null>(null);
  const destination = useMemo(() => stationCoordinates(station), [station]);
  const stations = useMemo(() => [station], [station]);

  useEffect(() => {
    let cancelled = false;
    const useFallback = () => {
      if (!cancelled) {
        setOrigin(fallbackOrigin);
        setLocationLabel("Route estimated from Lahore Gulberg");
      }
    };

    if (!navigator.geolocation) {
      window.setTimeout(useFallback, 0);
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!cancelled) {
          setOrigin({ lat: position.coords.latitude, lng: position.coords.longitude });
          setLocationLabel("Route from your current location");
        }
      },
      useFallback,
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 8000,
      },
    );

    return () => {
      cancelled = true;
    };
  }, [fallbackOrigin]);

  const handleRouteResolved = useCallback((route: { distanceText: string; durationText: string }) => {
    setRouteSummary(route);
  }, []);

  if (!origin) {
    return (
      <div className="min-h-[24rem] animate-pulse rounded-2xl border border-border bg-surface-strong sm:min-h-[30rem]" role="status">
        <span className="sr-only">Finding your location and preparing the route map.</span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <GoogleMap
        stations={stations}
        selectedStationId={station.id}
        center={destination || undefined}
        zoom={destination ? 14 : undefined}
        routeOrigin={destination ? origin : null}
        routeDestination={destination}
        onRouteResolved={handleRouteResolved}
        className="min-h-[24rem] rounded-2xl sm:min-h-[30rem]"
      />
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur">
        <p className="text-xs font-semibold text-muted">{locationLabel}</p>
        <p className="mt-1 text-sm font-bold text-foreground">
          {routeSummary ? `${routeSummary.distanceText} · ${routeSummary.durationText}` : destination ? "Calculating driving route…" : "Route unavailable"}
        </p>
      </div>
    </div>
  );
}
