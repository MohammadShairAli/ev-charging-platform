import { StationsToolbar } from "@/src/components/station/StationsToolbar";
import { StationList } from "@/src/components/station/StationList";
import { stationsService } from "@/src/services/stations.service";
import type { StationSort } from "@/src/types";

type ChargingStationsPageProps = {
  searchParams: Promise<{
    q?: string;
    sort?: StationSort;
  }>;
};

const validSorts: StationSort[] = ["name", "rating", "distance"];

export default async function ChargingStationsPage({ searchParams }: ChargingStationsPageProps) {
  const params = await searchParams;
  const sort = validSorts.includes(params.sort || "name") ? params.sort || "name" : "name";
  const query = params.q || "";
  const stations = await stationsService.list({ q: query, sort });

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-normal text-foreground">Charging Stations</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Search, filter, and open details for EV charging stations in Pakistan.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <StationsToolbar query={query} sort={sort} />
          <StationList stations={stations} />
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-3 text-sm font-medium text-muted">{stations.length} stations found</div>
          <div className="overflow-hidden rounded-md">
            <StationMapShell stations={stations} />
          </div>
        </div>
      </div>
    </section>
  );
}

async function StationMapShell({ stations }: { stations: Awaited<ReturnType<typeof stationsService.list>> }) {
  const { GoogleMap } = await import("@/src/components/map/GoogleMap");
  return <GoogleMap stations={stations} />;
}
