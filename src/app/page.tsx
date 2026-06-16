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
  const ratings = stations.map((station) => station.rating).filter((rating): rating is number => Boolean(rating));
  const averageRating = ratings.length
    ? (ratings.reduce((total, rating) => total + rating, 0) / ratings.length).toFixed(1)
    : "New";
  const operatorCount = new Set(stations.map((station) => station.operator).filter(Boolean)).size;

  return (
    <div>
      <section className="energy-grid bg-[linear-gradient(135deg,#06130f_0%,#0b3f2b_52%,#04211a_100%)] text-secondary">
        <div className="mx-0 grid max-w-[24rem] gap-8 px-4 pb-10 pt-8 sm:mx-auto sm:max-w-7xl sm:px-6 sm:pb-12 sm:pt-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-8">
          <div className="min-w-0">
            <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent backdrop-blur">
              Pakistan EV charging map
            </div>
            <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-normal min-[380px]:text-4xl sm:text-5xl lg:text-6xl">
              Charge smarter on every city drive
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-secondary/80 sm:text-lg">
              Find nearby EV charging stations, compare operators, and open directions with a map built for quick checks on the go.
            </p>
            <div className="mt-7">
              <SearchBar />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center sm:max-w-xl sm:gap-3">
              <HeroMetric value={`${stations.length}+`} label="Stations" />
              <HeroMetric value={operatorCount ? `${operatorCount}+` : "Live"} label="Operators" />
              <HeroMetric value={averageRating} label="Avg rating" />
            </div>
          </div>
          <div className="lg:pl-4">
            <GoogleMap stations={stations} />
          </div>
        </div>
      </section>

      <section className="mx-0 max-w-[24rem] px-4 py-9 sm:mx-auto sm:max-w-7xl sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Ready near you</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">Nearby charging stations</h2>
            <p className="mt-1 text-sm text-muted">Start with popular stations, then browse the full directory.</p>
          </div>
          <ButtonLink href={ROUTES.stations}>View All Stations</ButtonLink>
        </div>
        <StationList stations={nearbyStations} />
      </section>
    </div>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/15 bg-white/10 px-3 py-3 backdrop-blur">
      <div className="text-xl font-bold text-secondary sm:text-2xl">{value}</div>
      <div className="mt-1 truncate text-xs font-medium text-secondary/70">{label}</div>
    </div>
  );
}
