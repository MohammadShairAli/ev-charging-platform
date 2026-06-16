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
    <article className="group relative overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-[0_16px_38px_rgba(7,21,18,0.07)] transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_22px_50px_rgba(7,21,18,0.11)] sm:p-5">
      <span className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--accent),var(--primary))]" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-primary">
            {station.operator || "Operator unavailable"}
          </div>
          <h3 className="text-lg font-semibold leading-6 text-foreground">{station.name}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{station.address || "Address unavailable"}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5">
              <Star /> {station.rating ? station.rating.toFixed(1) : "No rating"}
            </span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">{formatDistance(station.distanceKm)}</span>
          </div>
        </div>
        <ButtonLink href={`${ROUTES.stations}/${station.id}`} className="sm:self-start">
          View Details
        </ButtonLink>
      </div>
    </article>
  );
}
