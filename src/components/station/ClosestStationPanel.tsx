"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleMap } from "@/src/components/map/GoogleMap";
import { ROUTES } from "@/src/lib/constants";
import type { DirectionsResult, LatLngLiteral, Station } from "@/src/types";
import { calculateDistanceKm, formatDistance } from "@/src/utils/distance";
import { googleMapsDirectionsUrl, stationCoordinates } from "@/src/utils/station";
import { isLikelyChargingStation } from "@/src/utils/station-quality";

type ClosestStationPanelProps = {
  stations: Station[];
  fallbackOrigin: LatLngLiteral;
  mapClassName?: string;
  variant?: "mobile" | "desktop";
  showMap?: boolean;
  showDetails?: boolean;
};

type ClosestStation = {
  station: Station;
  coordinates: LatLngLiteral;
  directDistanceKm: number;
};

const defaultDirections: DirectionsResult = {
  distanceText: "Distance unavailable",
  durationText: "ETA unavailable",
  polyline: null,
};

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

    if (!closest || directDistanceKm < closest.directDistanceKm) {
      return {
        station,
        coordinates,
        directDistanceKm,
      };
    }

    return closest;
  }, null);
}

export function ClosestStationPanel({
  stations,
  fallbackOrigin,
  mapClassName = "",
  variant = "mobile",
  showMap = true,
  showDetails = true,
}: ClosestStationPanelProps) {
  const [origin, setOrigin] = useState(fallbackOrigin);
  const [locationLabel, setLocationLabel] = useState("Estimated from Pakistan center");
  const [directions, setDirections] = useState<DirectionsResult>(defaultDirections);
  const closest = useMemo(() => findClosestStation(stations, origin), [origin, stations]);
  const directionsUrl = closest ? googleMapsDirectionsUrl(closest.station) : null;
  const closestImageUrl = closest?.station.google_place_id
    ? `/api/place-photo?placeId=${encodeURIComponent(closest.station.google_place_id)}`
    : "/icon.png";

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
        setLocationLabel("Using your current location");
      },
      () => {
        setLocationLabel("Location permission not enabled");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 8000,
      },
    );
  }, []);

  useEffect(() => {
    if (!closest) {
      return;
    }

    let cancelled = false;

    fetch("/api/directions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        origin,
        destination: closest.coordinates,
      }),
    })
      .then((response) => response.json())
      .then((data: { directions?: DirectionsResult }) => {
        if (!cancelled) {
          setDirections(data.directions || {
            distanceText: `${closest.directDistanceKm.toFixed(1)} km`,
            durationText: "ETA unavailable",
            polyline: null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDirections({
            distanceText: `${closest.directDistanceKm.toFixed(1)} km`,
            durationText: "ETA unavailable",
            polyline: null,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [closest, origin]);

  const selectedStations = useMemo(() => closest ? [closest.station] : stations, [closest, stations]);
  const handleRouteResolved = useCallback((route: { distanceText: string; durationText: string }) => {
    setDirections((current) => ({ ...current, ...route }));
  }, []);

  return (
    <div className={variant === "desktop" ? "grid gap-4" : showMap && !showDetails ? "h-full" : ""}>
      {showMap ? (
        <GoogleMap
          stations={selectedStations}
          selectedStationId={closest?.station.id}
          center={closest?.coordinates || fallbackOrigin}
          zoom={closest ? 12 : undefined}
          routePolyline={directions.polyline}
          routeOrigin={origin}
          routeDestination={closest?.coordinates || null}
          onRouteResolved={handleRouteResolved}
          className={mapClassName}
        />
      ) : null}

      {showDetails && closest ? (
        <div className="rounded-2xl border border-border bg-secondary p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-strong">
              <Image
                src={closestImageUrl}
                alt=""
                fill
                unoptimized
                sizes="44px"
                className={closest.station.google_place_id ? "object-cover" : "object-contain p-2"}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Closest EV station</p>
              <h2 className="mt-1 line-clamp-2 text-lg font-bold leading-6 text-foreground">{closest.station.name}</h2>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
            {closest.station.address || "Address unavailable"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ClosestMetric label="Distance" value={formatDistance(closest.directDistanceKm)} />
            <ClosestMetric label="Time" value={directions.durationText} />
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {locationLabel}
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href={`${ROUTES.stations}/${closest.station.id}`}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-secondary transition hover:bg-primary-hover"
            >
              View station
              <span aria-hidden="true">&rarr;</span>
            </Link>
            {directionsUrl ? (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${closest.station.name} in Google Maps`}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border bg-surface text-foreground transition hover:border-primary hover:text-primary"
              >
                <span className="material-symbols-outlined">
                  near_me
                </span>
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {showDetails && !closest ? (
        <div className="rounded-xl bg-secondary p-4 text-sm font-medium text-muted">No station coordinates available.</div>
      ) : null}
    </div>
  );
}

function ClosestMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background px-3 py-2.5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
