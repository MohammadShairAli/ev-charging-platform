"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { StationCard } from "@/src/components/station/StationCard";
import { COPY } from "@/src/lib/constants";
import type { LatLngLiteral, Station } from "@/src/types";
import { calculateDistanceKm } from "@/src/utils/distance";
import { stationCoordinates } from "@/src/utils/station";

type StationListProps = {
  stations: Station[];
  showPlaceImage?: boolean;
  showMapButton?: boolean;
  limit?: number;
  useNearbyApi?: boolean;
};

export function StationList({
  stations,
  showPlaceImage = false,
  showMapButton = false,
  limit,
  useNearbyApi = false,
}: StationListProps) {
  const [origin, setOrigin] = useState<LatLngLiteral | null>(null);
  const [nearbyStations, setNearbyStations] = useState<Station[] | null>(null);
  const [nearbyStatus, setNearbyStatus] = useState<"loading" | "idle" | "unavailable">(
    useNearbyApi ? "loading" : "idle",
  );
  const stationsWithDistance = useMemo(() => {
    let sortedStations = useNearbyApi ? nearbyStations || [] : stations;

    if (!origin) {
      return typeof limit === "number" ? sortedStations.slice(0, limit) : sortedStations;
    }

    sortedStations = sortedStations.map((station) => {
      const coordinates = stationCoordinates(station);

      if (!coordinates) {
        return station;
      }

      return {
        ...station,
        distanceKm: calculateDistanceKm(origin, coordinates),
      };
    }).sort((first, second) => (first.distanceKm ?? Number.POSITIVE_INFINITY) - (second.distanceKm ?? Number.POSITIVE_INFINITY));

    return typeof limit === "number" ? sortedStations.slice(0, limit) : sortedStations;
  }, [limit, nearbyStations, origin, stations, useNearbyApi]);

  useEffect(() => {
    if (!navigator.geolocation) {
      if (useNearbyApi) {
        window.setTimeout(() => setNearbyStatus("unavailable"), 0);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentOrigin = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setOrigin(currentOrigin);

        if (!useNearbyApi) {
          return;
        }

        const params = new URLSearchParams({
          lat: String(currentOrigin.lat),
          lng: String(currentOrigin.lng),
          sort: "distance",
        });

        fetch(`/api/stations?${params.toString()}`)
          .then((response) => response.json())
          .then((data: { stations?: Station[] }) => {
            if (data.stations?.length) {
              setNearbyStations(data.stations);
              setNearbyStatus("idle");
            } else {
              setNearbyStatus("unavailable");
            }
          })
          .catch(() => setNearbyStatus("unavailable"));
      },
      () => {
        if (useNearbyApi) {
          setNearbyStatus("unavailable");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 8000,
      },
    );
  }, [useNearbyApi]);

  if (useNearbyApi && !nearbyStations?.length) {
    return <StationListSkeleton count={limit || 3} dimmed={nearbyStatus === "unavailable"} />;
  }

  if (!stations.length && !nearbyStations?.length) {
    return <EmptyState title="No stations found" message={COPY.noStations} />;
  }

  return (
    <div className="grid gap-4 sm:gap-5">
      {stationsWithDistance.map((station) => (
        <StationCard
          key={station.id}
          station={station}
          showPlaceImage={showPlaceImage}
          showMapButton={showMapButton}
        />
      ))}
    </div>
  );
}

function StationListSkeleton({ count, dimmed = false }: { count: number; dimmed?: boolean }) {
  return (
    <div className={`grid gap-4 sm:gap-5 ${dimmed ? "opacity-70" : ""}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-surface-strong" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-strong" />
              <div className="h-3 w-full animate-pulse rounded bg-surface-strong" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-surface-strong" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <div className="h-4 w-16 animate-pulse rounded bg-surface-strong" />
              <div className="h-4 w-24 animate-pulse rounded bg-surface-strong" />
            </div>
            <div className="flex gap-2">
              <div className="h-11 w-28 animate-pulse rounded-lg bg-surface-strong" />
              <div className="h-11 w-11 animate-pulse rounded-lg bg-surface-strong" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
