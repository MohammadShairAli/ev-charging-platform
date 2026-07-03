import Link from "next/link";
import { notFound } from "next/navigation";
import { GoogleMap } from "@/src/components/map/GoogleMap";
import { ButtonLink } from "@/src/components/ui/ButtonLink";
import { stationsService } from "@/src/services/stations.service";
import { googleMapsDirectionsUrl, stationCoordinates } from "@/src/utils/station";

type StationDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StationDetailsPage({ params }: StationDetailsPageProps) {
  const { id } = await params;
  const station = await stationsService.findById(id);

  if (!station) {
    notFound();
  }

  const directionsUrl = googleMapsDirectionsUrl(station);
  const coordinates = stationCoordinates(station);

  return (
    <>
      <section className="bg-background sm:hidden">
        <div className="relative h-[18rem] overflow-hidden">
          <GoogleMap
            stations={[station]}
            selectedStationId={station.id}
            center={coordinates || undefined}
            zoom={coordinates ? 14 : undefined}
            className="h-full min-h-full rounded-none border-0 shadow-none"
          />
          <Link
            href="/charging-stations"
            aria-label="Back to stations"
            className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-border bg-secondary text-xl font-semibold text-foreground"
          >
            &lt;
          </Link>
        </div>

        <div className="relative z-10 -mt-8 rounded-t-[1.6rem] border border-border bg-secondary px-4 pb-5 pt-4">
          <div className="mb-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-primary">
            {station.operator || "Operator unavailable"}
          </div>
          <h1 className="text-2xl font-bold leading-tight text-foreground">{station.name}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{station.address || "Address unavailable"}</p>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <MobileDetailTile label="Rating" value={station.rating ? station.rating.toFixed(1) : "No rating"} />
            <MobileDetailTile label="Phone" value={station.phone || "Unavailable"} />
            <MobileDetailTile
              label="Coordinates"
              value={coordinates ? `${coordinates.lat.toFixed(3)}, ${coordinates.lng.toFixed(3)}` : "Unavailable"}
            />
            <MobileDetailTile label="Website" value={station.website ? "Available" : "Unavailable"} />
          </dl>

          <div className="mt-5 grid gap-3">
            {directionsUrl ? <ButtonLink href={directionsUrl} external>Get Directions</ButtonLink> : null}
            <ButtonLink href="/charging-stations" variant="secondary">Back to Stations</ButtonLink>
          </div>
        </div>
      </section>

      <section className="mx-auto hidden max-w-7xl px-4 py-6 sm:block sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
            <div className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-primary">
              {station.operator || "Operator unavailable"}
            </div>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl">
              {station.name}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted sm:text-base">{station.address || "Address unavailable"}</p>

            <dl className="mt-7 grid gap-4 rounded-lg border border-border bg-background p-4 text-sm sm:p-5">
              <DetailRow label="Google rating" value={station.rating ? station.rating.toFixed(1) : "No rating"} />
              <DetailRow label="Phone" value={station.phone || "Unavailable"} />
              <DetailRow
                label="Website"
                value={
                  station.website ? (
                    <a href={station.website} target="_blank" rel="noreferrer" className="font-medium text-primary">
                      Visit website
                    </a>
                  ) : (
                    "Unavailable"
                  )
                }
              />
              <DetailRow
                label="Coordinates"
                value={coordinates ? `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}` : "Unavailable"}
              />
            </dl>

            <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
              {directionsUrl ? <ButtonLink href={directionsUrl} external>Get Directions</ButtonLink> : null}
              <ButtonLink href="/charging-stations" variant="secondary">Back to Stations</ButtonLink>
            </div>
          </div>
          <div className="lg:sticky lg:top-24">
            <GoogleMap
              stations={[station]}
              selectedStationId={station.id}
              center={coordinates || undefined}
              zoom={coordinates ? 14 : undefined}
            />
          </div>
        </div>
      </section>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[150px_1fr]">
      <dt className="font-medium text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function MobileDetailTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-background p-3">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 truncate font-semibold text-foreground">{value}</dd>
    </div>
  );
}
