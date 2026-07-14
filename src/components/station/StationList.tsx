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
  const stationsWithDistance = useMemo(() => {
    let sortedStations = nearbyStations || stations;

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
  }, [limit, nearbyStations, origin, stations]);

  useEffect(() => {
    if (!navigator.geolocation) {
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
            }
          })
          .catch(() => undefined);
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 8000,
      },
    );
  }, [useNearbyApi]);

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
