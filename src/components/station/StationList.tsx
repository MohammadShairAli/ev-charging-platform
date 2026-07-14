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
};

export function StationList({ stations, showPlaceImage = false, showMapButton = false, limit }: StationListProps) {
  const [origin, setOrigin] = useState<LatLngLiteral | null>(null);
  const stationsWithDistance = useMemo(() => {
    let sortedStations = stations;

    if (!origin) {
      return typeof limit === "number" ? sortedStations.slice(0, limit) : sortedStations;
    }

    sortedStations = stations.map((station) => {
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
  }, [limit, origin, stations]);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 8000,
      },
    );
  }, []);

  if (!stations.length) {
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
