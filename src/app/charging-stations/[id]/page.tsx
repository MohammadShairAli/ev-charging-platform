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
    <section className="mx-0 max-w-[24rem] px-4 py-8 sm:mx-auto sm:max-w-7xl sm:px-6 sm:py-10 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-[0_18px_45px_rgba(7,21,18,0.08)] sm:p-6">
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
