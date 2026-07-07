export const dynamic = "force-dynamic";

import { ClosestStationPanel } from "@/src/components/station/ClosestStationPanel";
import { SearchBar } from "@/src/components/shared/SearchBar";
import { StationList } from "@/src/components/station/StationList";
import { ButtonLink } from "@/src/components/ui/ButtonLink";
import { appConfig } from "@/src/lib/config";
import { ROUTES } from "@/src/lib/constants";
import { stationsService } from "@/src/services/stations.service";

export default async function HomePage() {
  const stations = await stationsService.list() ?? [];
  const nearbyStations = stations.slice(0, 3);

  return (
    <div>
      <section className="relative bg-background sm:hidden">
        <div className="relative h-[20rem] overflow-hidden">
          <ClosestStationPanel
            stations={stations}
            fallbackOrigin={appConfig.google.pakistanCenter}
            mapClassName="h-full min-h-full rounded-none border-0"
            showDetails={false}
          />
        </div>

        <div className="relative z-10 -mt-8 px-4 pb-2">
          <ClosestStationPanel
            stations={stations}
            fallbackOrigin={appConfig.google.pakistanCenter}
            showMap={false}
          />

          <div className="mt-3">
            <SearchBar className="shadow-none" />
          </div>

          <div className="mt-3 hidden lg:block">
            <ButtonLink href={ROUTES.stations} className="min-h-14 rounded-xl">
              Find a charger
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="hidden bg-background text-foreground sm:block">
        <div className="mx-auto grid max-w-7xl gap-7 px-4 pb-8 pt-7 sm:gap-8 sm:px-6 sm:pb-12 sm:pt-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-8">
          <div className="min-w-0">
            <div className="mb-5 inline-flex rounded-full border border-border bg-surface-strong px-3 py-1.5 text-xs font-semibold text-primary">
              Pakistan EV charging map
            </div>
            <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-normal min-[380px]:text-4xl sm:text-5xl lg:text-6xl">
              Charge smarter on every city drive
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Find nearby EV charging stations, compare operators, and open directions with a map built for quick checks on the go.
            </p>
            <div className="mt-7">
              <SearchBar />
            </div>
            <div className="mt-6 inline-flex rounded-full border border-border bg-surface-strong px-4 py-2 text-sm font-semibold text-muted">
              {stations.length}+ charging stations indexed
            </div>
          </div>
          <div className="lg:pl-4">
            <ClosestStationPanel
              stations={stations}
              fallbackOrigin={appConfig.google.pakistanCenter}
              variant="desktop"
            />
          </div>
        </div>
      </section>

      <section className=" mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="hidden lg:flex mb-6  flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Ready near you</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">Nearby charging stations</h2>
            <p className="mt-1 text-sm text-muted">Start with popular stations, then browse the full directory.</p>
          </div>
          <ButtonLink href={ROUTES.stations}>View All Stations</ButtonLink>
        </div>
        <StationList stations={nearbyStations} showPlaceImage showMapButton />
      </section>
    </div>
  );
}
