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
    <section className="mx-0 max-w-[24rem] px-4 py-8 sm:mx-auto sm:max-w-7xl sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 rounded-lg bg-[linear-gradient(135deg,#071512_0%,#0d4b35_58%,#063026_100%)] p-5 text-secondary shadow-[0_20px_55px_rgba(7,21,18,0.16)] sm:p-7">
        <p className="text-sm font-semibold text-accent">Station directory</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">Charging Stations</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary/75 sm:text-base">
          Search, filter, and open details for EV charging stations in Pakistan.
        </p>
      </div>
      <StationsToolbar query={query} sort={sort} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="order-2 space-y-4 lg:order-1">
          <div className="rounded-full bg-surface-strong px-4 py-2 text-sm font-medium text-muted">
            {stations.length} station{stations.length === 1 ? "" : "s"} found
          </div>
          <StationList stations={stations} />
        </div>
        <div className="order-1 lg:sticky lg:top-24 lg:order-2 lg:self-start">
          <div className="rounded-lg border border-border bg-surface p-3 shadow-[0_18px_45px_rgba(7,21,18,0.09)]">
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
