import Link from "next/link";
import { notFound } from "next/navigation";
import { StationAmenities, StationPhotos } from "@/src/components/station/StationAmenities";
import { StationComingSoonSpecs } from "@/src/components/station/StationComingSoonSpecs";
import { NearbyFoodPlaces } from "@/src/components/station/NearbyFoodPlaces";
import { StationRouteMap } from "@/src/components/station/StationRouteMap";
import { ButtonLink } from "@/src/components/ui/ButtonLink";
import { requireSessionAccess } from "@/src/lib/auth-guard";
import { appConfig } from "@/src/lib/config";
import { ROUTES } from "@/src/lib/constants";
import { googleService } from "@/src/services/google.service";
import { stationsService } from "@/src/services/stations.service";
import { googleMapsDirectionsUrl, stationCoordinates } from "@/src/utils/station";

export const dynamic = "force-dynamic";

type StationDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StationDetailsPage({ params }: StationDetailsPageProps) {
  await requireSessionAccess();
  const { id } = await params;
  const station = await stationsService.findById(id);

  if (!station) {
    notFound();
  }

  const directionsUrl = googleMapsDirectionsUrl(station);
  const coordinates = stationCoordinates(station);
  const [amenities, nearbyFood] = await Promise.all([
    station.google_place_id
      ? googleService.getPlaceAmenities(station.google_place_id).catch(() => null)
      : Promise.resolve(null),
    coordinates
      ? googleService.searchNearbyFoodAndCoffee(coordinates).catch(() => ({ coffee: [], restaurants: [] }))
      : Promise.resolve({ coffee: [], restaurants: [] }),
  ]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href={ROUTES.stations}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-primary"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>
        Back to charging stations
      </Link>

      <header className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="max-w-4xl">
          {station.operator ? (
            <div className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-primary">
              {station.operator}
            </div>
          ) : null}
          <h1 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">{station.name}</h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">{station.address || "Address unavailable"}</p>
        </div>
        <div className="grid gap-3 sm:flex sm:flex-wrap lg:justify-end">
          {directionsUrl ? <ButtonLink href={directionsUrl} external>Open in Google Maps</ButtonLink> : null}
          <ButtonLink href={ROUTES.stations} variant="secondary">Back to stations</ButtonLink>
        </div>
      </header>

      <div className="mt-7 grid gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
          <StationAmenities amenities={amenities} />
          <NearbyFoodPlaces places={nearbyFood} />
          <StationComingSoonSpecs className="mt-6" />
        </div>
        <div className="lg:sticky lg:top-24">
          <StationRouteMap station={station} fallbackOrigin={appConfig.google.lahoreGulbergCenter} />
        </div>
      </div>

      <StationPhotos amenities={amenities} placeId={station.google_place_id} className="mt-8" />

      <section className="mt-8 rounded-2xl border border-border bg-surface p-4 sm:p-6" aria-labelledby="station-details-heading">
        <h2 id="station-details-heading" className="text-xl font-bold text-foreground">Station details</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailTile label="Google rating" value={station.rating ? station.rating.toFixed(1) : "No rating"} />
          <DetailTile label="Phone" value={station.phone || "Unavailable"} />
          <DetailTile
            label="Website"
            value={station.website ? (
              <a href={station.website} target="_blank" rel="noreferrer" className="font-medium text-primary">
                {readableUrl(station.website)}
              </a>
            ) : "Unavailable"}
          />
          <DetailTile
            label="Coordinates"
            value={coordinates ? `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}` : "Unavailable"}
          />
        </dl>
      </section>

    </section>
  );
}

function readableUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function DetailTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-bold text-foreground">{value}</dd>
    </div>
  );
}
