export const dynamic = "force-dynamic";

import { ClosestStationPanel } from "@/src/components/station/ClosestStationPanel";
import { EmergencyStationProvider } from "@/src/components/station/EmergencyStationProvider";
import { SearchBar } from "@/src/components/shared/SearchBar";
import { StationList } from "@/src/components/station/StationList";
import { ButtonLink } from "@/src/components/ui/ButtonLink";
import { appConfig } from "@/src/lib/config";
import { EMERGENCY_CONTACTS, ROUTES } from "@/src/lib/constants";
// import { requireSessionAccess } from "@/src/lib/auth-guard";
import { stationsService } from "@/src/services/stations.service";

export default async function HomePage() {
  // await requireSessionAccess();
  const stations = await stationsService.list() ?? [];
  const emergencyFallbackOrigin = appConfig.google.lahoreGulbergCenter;

  return (
    <EmergencyStationProvider stations={stations} fallbackOrigin={emergencyFallbackOrigin}>
      <div>
      <section className="relative bg-background sm:hidden">
        <div className="relative h-[20rem] overflow-hidden">
          <ClosestStationPanel
            mapClassName="h-full min-h-full rounded-none border-0"
            showDetails={false}
          />
        </div>

        <div className="relative z-10 -mt-8 px-4 pb-2">
          <ClosestStationPanel
            showMap={false}
          />

          <EmergencyContactGrid compact />
        </div>
      </section>

      <section className="hidden bg-background text-foreground sm:block">
        <div className="mx-auto grid max-w-7xl gap-7 px-4 pb-8 pt-7 sm:gap-8 sm:px-6 sm:pb-12 sm:pt-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start lg:px-8">
          <div className="min-w-0">
            <div className="mb-5 inline-flex rounded-full border border-border bg-surface-strong px-3 py-1.5 text-xs font-semibold text-primary">
              Emergency mode
            </div>
            <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-normal min-[380px]:text-4xl sm:text-5xl lg:text-6xl">
              Get help, then get charged
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              See the closest charger, call roadside or emergency support, and open directions quickly when your battery or route becomes urgent.
            </p>
            <div className="mt-7">
              <SearchBar />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={ROUTES.stations}>Find chargers</ButtonLink>
              <ButtonLink href={ROUTES.planTrip} variant="secondary">Plan safe route</ButtonLink>
            </div>
            <EmergencyContactGrid />
          </div>
          <div className="lg:pl-4">
            <ClosestStationPanel
              variant="desktop"
            />
          </div>
        </div>
      </section>

      <section className=" mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="hidden lg:flex mb-6  flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Backup options</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">Charging stations near your route</h2>
            <p className="mt-1 text-sm text-muted">Use these as quick alternatives while emergency mode finds the closest charger.</p>
          </div>
          <ButtonLink href={ROUTES.stations}>View All Stations</ButtonLink>
        </div>
        <StationList
          stations={stations}
          showPlaceImage
          showMapButton
          limit={3}
          useNearbyApi
          fallbackOrigin={emergencyFallbackOrigin}
        />
      </section>
      </div>
    </EmergencyStationProvider>
  );
}

function EmergencyContactGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-2 ${compact ? "mt-3" : "mt-6 sm:grid-cols-2"}`}>
      {EMERGENCY_CONTACTS.map((contact) => (
        <a
          key={contact.number}
          href={`tel:${contact.number}`}
          className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-foreground transition hover:border-primary hover:text-primary"
        >
          <span className="min-w-0">
            <span className="block text-sm font-bold">{contact.label}</span>
            <span className="mt-0.5 line-clamp-1 block text-xs text-muted">{contact.description}</span>
          </span>
          <span className="rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-secondary">{contact.number}</span>
        </a>
      ))}
    </div>
  );
}
