export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { SearchBar } from "@/src/components/shared/SearchBar";
import { StationList } from "@/src/components/station/StationList";
import { ButtonLink } from "@/src/components/ui/ButtonLink";
import { AppIcon } from "@/src/components/ui/AppIcon";
import { ROUTES } from "@/src/lib/constants";
import { stationsService } from "@/src/services/stations.service";

const platformTools = [
  {
    href: ROUTES.stations,
    icon: "ev_station",
    title: "Find charging stations",
    description: "Search charging locations and review useful station details before you drive.",
  },
  {
    href: ROUTES.planTrip,
    icon: "route",
    title: "Plan an EV trip",
    description: "Choose your car, use its real range, and build a route with reachable charging stops.",
  },
  {
    href: ROUTES.costComparison,
    icon: "calculate",
    title: "Compare running costs",
    description: "Estimate EV charging costs and compare them with petrol-powered travel.",
  },
  {
    href: ROUTES.evDatabase,
    icon: "directions_car",
    title: "Explore EV models",
    description: "Browse EV, plug-in hybrid, and hybrid vehicles available in the database.",
  },
] as const;

export default async function HomePage() {
  const stations = await stationsService.list() ?? [];

  return (
    <main>
      <section className="overflow-hidden border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:px-8 lg:py-20">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
              Pakistan&apos;s EV driving companion
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Drive electric with confidence
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
              Find chargers, plan range-aware journeys, compare ownership costs, and discover the right electric vehicle in one place.
            </p>

            <div className="mt-7 max-w-xl">
              <SearchBar />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={ROUTES.stations}>Find a charger</ButtonLink>
              <ButtonLink href={ROUTES.planTrip} variant="secondary">Plan my trip</ButtonLink>
            </div>

            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 border-t border-border pt-6">
              <HomeMetric value="EV" label="Range planning" />
              <HomeMetric value="Live" label="Station search" />
              <HomeMetric value="PK" label="Local vehicle data" />
            </div>
          </div>

          <div className="relative min-h-[20rem] overflow-hidden rounded-[2rem] border border-border bg-background shadow-sm sm:min-h-[28rem] lg:min-h-[34rem]">
            <Image
              src="/ev-hero.png"
              alt="Electric car connected to a charging station with a route map in the background"
              fill
              priority
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/50 bg-white/90 p-4 shadow-lg backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-secondary">
                  <AppIcon name="electric_bolt" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">One platform for every EV journey</p>
                  <p className="mt-1 text-xs leading-5 text-muted">From choosing a car to reaching the next charger.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Everything you need</p>
          <h2 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Make EV ownership easier</h2>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            Use focused tools for everyday charging, long-distance travel, vehicle research, and cost decisions.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {platformTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex min-h-56 flex-col rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-1 hover:border-primary hover:shadow-lg"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-background text-primary">
                <AppIcon name={tool.icon} className="h-[1.45rem] w-[1.45rem]" />
              </span>
              <h3 className="mt-6 text-lg font-bold text-foreground">{tool.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{tool.description}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-bold text-primary">
                Open tool
                <AppIcon name="arrow_forward" className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Charging network</p>
              <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Explore charging stations</h2>
              <p className="mt-2 text-sm text-muted">Review available locations before opening the complete station finder.</p>
            </div>
            <ButtonLink href={ROUTES.stations} variant="secondary">View all stations</ButtonLink>
          </div>
          <StationList stations={stations} showPlaceImage showMapButton limit={3} />
        </div>
      </section>
    </main>
  );
}

function HomeMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-bold text-foreground sm:text-base">{value}</p>
      <p className="mt-1 text-[0.68rem] leading-4 text-muted sm:text-xs">{label}</p>
    </div>
  );
}
