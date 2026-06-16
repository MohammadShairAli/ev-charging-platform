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
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-sm font-semibold text-primary">{station.operator || "Operator unavailable"}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">{station.name}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{station.address || "Address unavailable"}</p>

          <dl className="mt-7 grid gap-4 rounded-md border border-border bg-secondary p-5 text-sm">
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

          <div className="mt-6 flex flex-wrap gap-3">
            {directionsUrl ? <ButtonLink href={directionsUrl} external>Get Directions</ButtonLink> : null}
            <ButtonLink href="/charging-stations">Back to Stations</ButtonLink>
          </div>
        </div>
        <GoogleMap
          stations={[station]}
          selectedStationId={station.id}
          center={coordinates || undefined}
          zoom={coordinates ? 14 : undefined}
        />
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
      <dt className="font-medium text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
