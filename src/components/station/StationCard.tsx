import Image from "next/image";
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
    <article className="group rounded-2xl border border-border bg-surface p-4 transition hover:border-primary sm:p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-strong">
          <Image src="/icon.png" alt="" width={46} height={46} className="h-11 w-11 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {station.operator || "Operator unavailable"}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-6 text-foreground">{station.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{station.address || "Address unavailable"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Star /> {station.rating ? station.rating.toFixed(1) : "No rating"}
          </span>
          <span>{formatDistance(station.distanceKm)}</span>
        </div>
        <ButtonLink href={`${ROUTES.stations}/${station.id}`} variant="secondary" className="sm:self-start">
          View Details
        </ButtonLink>
      </div>
    </article>
  );
}
