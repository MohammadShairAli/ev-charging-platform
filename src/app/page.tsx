export const dynamic = "force-dynamic";

import { GoogleMap } from "@/src/components/map/GoogleMap";
import { SearchBar } from "@/src/components/shared/SearchBar";
import { StationList } from "@/src/components/station/StationList";
import { ButtonLink } from "@/src/components/ui/ButtonLink";
import { ROUTES } from "@/src/lib/constants";
import { stationsService } from "@/src/services/stations.service";

export default async function HomePage() {
  const stations = await stationsService.list() ?? [];
  const nearbyStations = stations.slice(0, 3);

  return (
    <div>
      <section className="bg-primary text-secondary">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl font-bold leading-tight tracking-normal sm:text-5xl">
              Find EV charging stations across Pakistan
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-secondary/90">
              Search by city or area, view stations on Google Maps, and open navigation when you are ready to drive.
            </p>
            <div className="mt-7">
              <SearchBar />
            </div>
          </div>
          <div className="min-h-96">
            <GoogleMap stations={stations} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Nearby charging stations</h2>
            <p className="mt-1 text-sm text-muted">Start with popular stations, then browse the full directory.</p>
          </div>
          <ButtonLink href={ROUTES.stations}>View All Stations</ButtonLink>
        </div>
        <StationList stations={nearbyStations} />
      </section>
    </div>
  );
}
