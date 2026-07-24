import Image from "next/image";
import { Star } from "@/src/components/ui/Star";
import { ButtonLink } from "@/src/components/ui/ButtonLink";
import { AppIcon } from "@/src/components/ui/AppIcon";
import { StationComingSoonSpecs } from "@/src/components/station/StationComingSoonSpecs";
import { ROUTES } from "@/src/lib/constants";
import type { Station } from "@/src/types";
import { formatDistance } from "@/src/utils/distance";
import { googleMapsDirectionsUrl } from "@/src/utils/station";

type StationCardProps = {
  station: Station;
  showPlaceImage?: boolean;
  showMapButton?: boolean;
  distanceFromCurrentLocation?: boolean;
  distanceStatus?: "loading" | "ready" | "unavailable";
};

export function StationCard({
  station,
  showPlaceImage = false,
  showMapButton = false,
  distanceFromCurrentLocation = false,
  distanceStatus = "ready",
}: StationCardProps) {
  const directionsUrl = googleMapsDirectionsUrl(station);
  const placeImageUrl = station.google_place_id
    ? `/api/place-photo?placeId=${encodeURIComponent(station.google_place_id)}`
    : "/icon.png";

  return (
    <article className="group rounded-2xl border border-border bg-surface p-4 transition hover:border-border sm:p-5">
      <div className="flex items-start gap-4">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-strong">
          {showPlaceImage ? (
            <Image
              src={placeImageUrl}
              alt=""
              fill
              unoptimized
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <Image src="/icon.png" alt="" width={46} height={46} className="h-11 w-11 object-contain" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {station.operator ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {station.operator}
            </p>
          ) : null}
          <h3 className="mt-1 text-lg font-semibold leading-6 text-foreground">{station.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{station.address || "Address unavailable"}</p>
        </div>
      </div>

      <StationComingSoonSpecs className="mt-4" />

      <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Star /> {station.rating ? station.rating.toFixed(1) : "No rating"}
          </span>
          {distanceFromCurrentLocation ? (
            <span className="inline-flex items-center gap-1.5">
              <AppIcon name="my_location" className="h-4 w-4 text-primary" />
              {distanceStatus === "loading"
                ? "Locating you..."
                : distanceStatus === "unavailable"
                  ? "Location unavailable"
                  : `${formatDistance(station.distanceKm)} from you`}
            </span>
          ) : (
            <span>{formatDistance(station.distanceKm)}</span>
          )}
        </div>
        <div className="flex w-full gap-2 sm:w-auto sm:self-start">
          <ButtonLink href={`${ROUTES.stations}/${station.id}`} variant="secondary" className="flex-1 sm:flex-none">
            View Details
          </ButtonLink>
          {showMapButton && directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${station.name} in Google Maps`}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border bg-surface text-foreground transition hover:border-border hover:text-primary"
            >
              <AppIcon name="near_me" className="h-5 w-5" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
