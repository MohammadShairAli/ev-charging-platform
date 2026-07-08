import Link from "next/link";
import { GoogleMap } from "@/src/components/map/GoogleMap";
import { StationsToolbar } from "@/src/components/station/StationsToolbar";
import { StationList } from "@/src/components/station/StationList";
import { stationsService } from "@/src/services/stations.service";
import type { StationSort } from "@/src/types";

type ChargingStationsPageProps = {
  searchParams: Promise<{
    q?: string;
    sort?: StationSort;
    page?: string;
  }>;
};

const validSorts: StationSort[] = ["name", "rating", "distance"];
const pageSize = 6;

export default async function ChargingStationsPage({ searchParams }: ChargingStationsPageProps) {
  const params = await searchParams;
  const sort = validSorts.includes(params.sort || "name") ? params.sort || "name" : "name";
  const query = params.q || "";
  const stations = await stationsService.list({ q: query, sort });
  const requestedPage = Math.floor(Number(params.page || "1"));
  const totalPages = Math.max(1, Math.ceil(stations.length / pageSize));
  const currentPage = Number.isFinite(requestedPage) ? Math.min(Math.max(1, requestedPage), totalPages) : 1;
  const paginatedStations = stations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <section className="bg-background sm:hidden">
        <div className="relative h-[19rem] overflow-hidden">
          <GoogleMap stations={stations} className="h-full min-h-full rounded-none border-0 shadow-none" />
        </div>

        <div className="relative z-10 -mt-8 rounded-t-[1.6rem] border border-border bg-secondary px-3 pb-4 pt-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Station directory</p>
              <h1 className="text-2xl font-bold text-foreground">Find chargers</h1>
            </div>
            <div className="rounded-full bg-surface-strong px-3 py-1.5 text-xs font-semibold text-muted">
              {stations.length} found
            </div>
          </div>

          <StationsToolbar query={query} sort={sort} />

          <div className="my-3 rounded-full bg-surface-strong px-4 py-2 text-sm font-medium text-muted">
            {stations.length} station{stations.length === 1 ? "" : "s"} found
          </div>
          <StationList stations={paginatedStations} showMapButton />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            query={query}
            sort={sort}
            className="mt-4"
          />
        </div>
      </section>

      <section className="mx-auto hidden max-w-7xl px-4 py-6 sm:block sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 rounded-lg border border-border bg-surface p-5 text-foreground sm:p-7">
          <p className="text-sm font-semibold text-primary">Station directory</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">Charging Stations</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Search, filter, and open details for EV charging stations in Pakistan.
          </p>
        </div>
        <StationsToolbar query={query} sort={sort} />
        <div className="mt-5 grid gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="order-2 space-y-4 lg:order-1">
            <div className="rounded-full bg-surface-strong px-4 py-2 text-sm font-medium text-muted">
              {stations.length} station{stations.length === 1 ? "" : "s"} found
            </div>
            <StationList stations={paginatedStations} showMapButton />
            <Pagination currentPage={currentPage} totalPages={totalPages} query={query} sort={sort} />
          </div>
          <div className="order-1 lg:sticky lg:top-24 lg:order-2 lg:self-start">
            <div className="rounded-lg border border-border bg-surface p-2 sm:p-3">
              <StationMapShell stations={stations} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Pagination({
  currentPage,
  totalPages,
  query,
  sort,
  className = "",
}: {
  currentPage: number;
  totalPages: number;
  query: string;
  sort: StationSort;
  className?: string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className={`rounded-lg border border-border bg-surface px-3 py-3 ${className}`} aria-label="Station pages">
      <div className="mb-3 text-center text-sm font-medium text-muted">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center justify-between gap-2">
      <PaginationLink page={currentPage - 1} disabled={currentPage === 1} query={query} sort={sort}>
        Previous
      </PaginationLink>
      <div className="flex min-w-0 items-center justify-center gap-1">
        {visiblePages(currentPage, totalPages).map((page) => (
          <PaginationLink
            key={page}
            page={page}
            active={page === currentPage}
            compact
            query={query}
            sort={sort}
          >
            {page}
          </PaginationLink>
        ))}
      </div>
      <PaginationLink page={currentPage + 1} disabled={currentPage === totalPages} query={query} sort={sort}>
        Next
      </PaginationLink>
      </div>
    </nav>
  );
}

function visiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  const end = Math.min(totalPages, start + 2);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function PaginationLink({
  page,
  query,
  sort,
  children,
  active,
  compact,
  disabled,
}: {
  page: number;
  query: string;
  sort: StationSort;
  children: React.ReactNode;
  active?: boolean;
  compact?: boolean;
  disabled?: boolean;
}) {
  const className = `${compact ? "h-9 w-9 px-0" : "min-h-10 px-3"} inline-flex shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
    active
      ? "bg-primary text-secondary"
      : disabled
        ? "cursor-not-allowed bg-background text-muted/45"
        : "bg-background text-foreground hover:bg-accent-soft hover:text-primary"
  }`;

  if (disabled) {
    return <span className={className}>{children}</span>;
  }

  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (sort !== "name") {
    params.set("sort", sort);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const href = params.toString() ? `/charging-stations?${params.toString()}` : "/charging-stations";

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {children}
    </Link>
  );
}

async function StationMapShell({ stations }: { stations: Awaited<ReturnType<typeof stationsService.list>> }) {
  const { GoogleMap } = await import("@/src/components/map/GoogleMap");
  return <GoogleMap stations={stations} />;
}
