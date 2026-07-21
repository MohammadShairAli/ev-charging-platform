import type { StationAmenitiesData } from "@/src/types";
import { StationPhotoGallery } from "@/src/components/station/StationPhotoGallery";
import { AppIcon } from "@/src/components/ui/AppIcon";

type Facility = {
  label: string;
  icon: string;
  value: boolean | null;
};

export function StationAmenities({
  amenities,
  className = "",
}: {
  amenities: StationAmenitiesData | null;
  className?: string;
}) {
  const facilities: Facility[] = [
    { label: "Washroom", icon: "wc", value: amenities?.restroom ?? null },
    { label: "Prayer area", icon: "mosque", value: amenities?.prayerArea ?? null },
    { label: "Security", icon: "shield", value: amenities?.security ?? null },
    { label: "Parking", icon: "local_parking", value: amenities?.parking ?? null },
  ];

  return (
    <section className={className} aria-label="Station amenities and information">
      <div>
        <h2 className="text-lg font-bold text-foreground">Amenities &amp; information</h2>
        <p className="mt-1 text-xs leading-5 text-muted">Live place information, refreshed when this page loads.</p>
      </div>

      <OpeningHoursCard openNow={amenities?.openNow ?? null} todayHours={amenities?.todayHours ?? null} />

      <FacilityList facilities={facilities} />
    </section>
  );
}

export function StationPhotos({
  amenities,
  placeId,
  className = "",
}: {
  amenities: StationAmenitiesData | null;
  placeId: string | null;
  className?: string;
}) {
  const photos = placeId ? amenities?.photos || [] : [];

  if (!photos.length) {
    return (
      <section className={`rounded-2xl border border-dashed border-border bg-surface p-5 ${className}`} aria-label="Station photos">
        <h2 className="text-lg font-bold text-foreground">Station photos</h2>
        <p className="mt-1 text-sm text-muted">No photos are listed by the place provider.</p>
      </section>
    );
  }

  return (
    <section className={className} aria-label="Station photos">
      <StationPhotoGallery photos={photos} placeId={placeId!} />
    </section>
  );
}

function OpeningHoursCard({ openNow, todayHours }: { openNow: boolean | null; todayHours: string | null }) {
  const status = openNow === true ? "Open now" : openNow === false ? "Closed now" : "Hours not listed";

  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-accent-soft p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-primary" aria-hidden="true">
        <AppIcon name="schedule" className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Today&apos;s opening hours</p>
        <p className="mt-1 text-base font-bold text-foreground">{todayHours || "Not provided"}</p>
        <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${openNow === true ? "bg-primary text-secondary" : "bg-secondary text-muted"}`}>
          {status}
        </span>
      </div>
    </div>
  );
}

function FacilityList({ facilities }: { facilities: Facility[] }) {
  return (
    <div className="mt-5">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {facilities.map((facility) => (
          <li key={facility.label} className="flex min-w-0 items-center gap-1.5 rounded-lg border border-border bg-background p-2.5">
            <AppIcon name={facility.icon} className={`h-[1.125rem] w-[1.125rem] ${facility.value === true ? "text-primary" : "text-muted"}`} />
            <span className="min-w-0">
              <span className="block truncate text-[0.7rem] font-bold leading-4 text-foreground">{facility.label}</span>
              <FacilityStatus value={facility.value} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FacilityStatus({ value }: { value: boolean | null }) {
  const label = value === true ? "Confirmed" : value === false ? "Unavailable" : "Usually available";
  const dotTone = value === true ? "bg-primary" : value === false ? "bg-muted" : "bg-amber-500";

  return (
    <span className="mt-0.5 flex min-w-0 items-start gap-1 text-[0.58rem] font-medium leading-3 text-muted">
      <span className={`mt-[0.2rem] h-1.5 w-1.5 shrink-0 rounded-full ${dotTone}`} aria-hidden="true" />
      <span className="min-w-0">{label}</span>
    </span>
  );
}
