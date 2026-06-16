import { Star } from "@/src/components/ui/Star";
import { ButtonLink } from "@/src/components/ui/ButtonLink";
import { ROUTES } from "@/src/lib/constants";
import type { Station } from "@/src/types";
import { formatDistance } from "@/src/utils/distance";

type StationCardProps = {
  station: Station;
};

export function StationCard({ station }: StationCardProps) {
  return (
    <article className="rounded-md border border-border bg-secondary p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{station.name}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{station.address || "Address unavailable"}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Star /> {station.rating ? station.rating.toFixed(1) : "No rating"}
            </span>
            <span>{station.operator || "Operator unavailable"}</span>
            <span>{formatDistance(station.distanceKm)}</span>
          </div>
        </div>
        <ButtonLink href={`${ROUTES.stations}/${station.id}`}>View Details</ButtonLink>
      </div>
    </article>
  );
}
