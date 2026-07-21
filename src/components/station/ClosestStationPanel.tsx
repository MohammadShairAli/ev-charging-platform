"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { GoogleMap } from "@/src/components/map/GoogleMap";
import { AppIcon } from "@/src/components/ui/AppIcon";
import { useEmergencyStationData } from "@/src/components/station/EmergencyStationProvider";
import { StationComingSoonSpecs } from "@/src/components/station/StationComingSoonSpecs";
import { ROUTES } from "@/src/lib/constants";
import { formatDistance } from "@/src/utils/distance";
import { googleMapsDirectionsUrl } from "@/src/utils/station";

type ClosestStationPanelProps = {
  mapClassName?: string;
  variant?: "mobile" | "desktop";
  showMap?: boolean;
  showDetails?: boolean;
};

export function ClosestStationPanel({
  mapClassName = "",
  variant = "mobile",
  showMap = true,
  showDetails = true,
}: ClosestStationPanelProps) {
  const {
    origin,
    locationLabel,
    nearbyStations,
    closest,
    directions,
    directionsReady,
    isDesktop,
    handleRouteResolved,
  } = useEmergencyStationData();
  const isActiveViewport = isDesktop === null || (variant === "desktop" ? isDesktop : !isDesktop);
  const isLoading = !origin || !nearbyStations || !directionsReady;
  const directionsUrl = closest ? googleMapsDirectionsUrl(closest.station) : null;
  const closestImageUrl = closest?.station.google_place_id
    ? `/api/place-photo?placeId=${encodeURIComponent(closest.station.google_place_id)}`
    : "/icon.png";

  const selectedStations = useMemo(() => closest ? [closest.station] : nearbyStations || [], [closest, nearbyStations]);

  if (!isActiveViewport) {
    return null;
  }

  return (
    <div className={variant === "desktop" ? "grid gap-4" : showMap && !showDetails ? "h-full" : ""}>
      {showMap && isLoading ? (
        <LocationLoading className={mapClassName} map />
      ) : null}

      {showMap && !isLoading ? (
        <GoogleMap
          stations={selectedStations}
          selectedStationId={closest?.station.id}
          center={closest?.coordinates || origin || undefined}
          zoom={closest ? 12 : undefined}
          routePolyline={directions.polyline}
          routeOrigin={origin}
          routeDestination={closest?.coordinates || null}
          onRouteResolved={handleRouteResolved}
          className={mapClassName}
        />
      ) : null}

      {showDetails && isLoading ? <LocationLoading /> : null}

      {showDetails && !isLoading && closest ? (
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
          <StationComingSoonSpecs className="mt-2" />
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
                <AppIcon name="near_me" className="h-5 w-5" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {showDetails && !isLoading && !closest ? (
        <div className="rounded-xl bg-secondary p-4 text-sm font-medium text-muted">No station coordinates available.</div>
      ) : null}
    </div>
  );
}

function LocationLoading({ className = "", map = false }: { className?: string; map?: boolean }) {
  if (map) {
    return (
      <div
        className={`min-h-[17rem] h-full animate-pulse bg-surface-strong sm:min-h-96 ${className}`}
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Finding the closest charger near you.</span>
      </div>
    );
  }

  return (
    <div
      className="animate-pulse rounded-2xl border border-border bg-secondary p-4 sm:p-5"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Finding the closest charger near you.</span>
      <div className="flex items-start gap-3" aria-hidden="true">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-surface-strong" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-28 rounded bg-surface-strong" />
          <div className="h-5 w-3/4 rounded bg-surface-strong" />
        </div>
      </div>
      <div className="mt-3 space-y-2" aria-hidden="true">
        <div className="h-3 w-full rounded bg-surface-strong" />
        <div className="h-3 w-2/3 rounded bg-surface-strong" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2" aria-hidden="true">
        <div className="h-[3.75rem] rounded-xl bg-surface-strong" />
        <div className="h-[3.75rem] rounded-xl bg-surface-strong" />
      </div>
      <div className="mt-2 h-[3.75rem] rounded-xl bg-surface-strong" aria-hidden="true" />
      <div className="mt-3 h-3 w-40 rounded bg-surface-strong" aria-hidden="true" />
      <div className="mt-4 flex gap-2" aria-hidden="true">
        <div className="h-12 flex-1 rounded-xl bg-surface-strong" />
        <div className="h-12 w-12 shrink-0 rounded-xl bg-surface-strong" />
      </div>
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
