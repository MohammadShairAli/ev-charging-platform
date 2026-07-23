import Link from "next/link";
import { GoogleMap } from "@/src/components/map/GoogleMap";
import { SearchBar } from "@/src/components/shared/SearchBar";
import { StationsToolbar } from "@/src/components/station/StationsToolbar";
import { StationList } from "@/src/components/station/StationList";
import { ROUTES } from "@/src/lib/constants";
import { stationsService } from "@/src/services/stations.service";
import type { LatLngLiteral, StationSort } from "@/src/types";

export const dynamic = "force-dynamic";

type ChargingStationsPageProps = {
  searchParams: Promise<{
    q?: string;
    sort?: StationSort;
    page?: string;
    lat?: string;
    lng?: string;
  }>;
};

const validSorts: StationSort[] = ["name", "rating", "distance"];
const pageSize = 6;

export default async function ChargingStationsPage({ searchParams }: ChargingStationsPageProps) {
  const params = await searchParams;
  const sort = validSorts.includes(params.sort || "distance") ? params.sort || "distance" : "distance";
  const query = params.q || "";
  const origin = parseOrigin(params.lat, params.lng);
  const stations = await stationsService.list({ q: query, sort, origin });
  const requestedPage = Math.floor(Number(params.page || "1"));
  const totalPages = Math.max(1, Math.ceil(stations.length / pageSize));
  const currentPage = Number.isFinite(requestedPage) ? Math.min(Math.max(1, requestedPage), totalPages) : 1;
  const paginatedStations = stations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <section className="bg-background sm:hidden">
        <div className="relative h-[19rem] overflow-hidden">
          <div className="absolute inset-x-3 top-3 z-20">
            <SearchBar
              action={ROUTES.stations}
              defaultValue={query}
              compact
              floating
              suggestions={stations}
              className="mx-auto"
            />
          </div>
          <GoogleMap
            stations={paginatedStations}
            selectedStationId={paginatedStations[0]?.id}
            className="h-full min-h-full rounded-none border-0 shadow-none"
          />
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

          <StationsToolbar query={query} sort={sort} showSearch={false} />

          <div className="my-3 rounded-full bg-surface-strong px-4 py-2 text-sm font-medium text-muted">
            {stations.length} station{stations.length === 1 ? "" : "s"} found
          </div>
          <StationList
            stations={paginatedStations}
            showPlaceImage
            showMapButton
            distanceFromCurrentLocation
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            query={query}
            sort={sort}
            origin={origin}
            className="mt-4"
          />
        </div>
      </section>

      <section className="mx-auto hidden max-w-7xl px-4 py-6 sm:block sm:px-6 sm:py-10 lg:px-8">
        <div className="rounded-lg border border-border bg-surface p-5 pb-12 text-foreground sm:p-7 sm:pb-14">
          <p className="text-sm font-semibold text-primary">Station directory</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">Charging Stations</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Search, filter, and open details for EV charging stations in Pakistan.
          </p>
        </div>
        <StationsToolbar query={query} sort={sort} showSearch={false} />
        <div className="mt-5 grid gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="order-2 space-y-4 lg:order-1">
            <div className="hidden lg:block">
              <SearchBar
                action={ROUTES.stations}
                defaultValue={query}
                floating
                suggestions={stations}
              />
            </div>
            <div className="rounded-full bg-surface-strong px-4 py-2 text-sm font-medium text-muted">
              {stations.length} station{stations.length === 1 ? "" : "s"} found
            </div>
            <StationList
              stations={paginatedStations}
              showPlaceImage
              showMapButton
              distanceFromCurrentLocation
            />
            <Pagination currentPage={currentPage} totalPages={totalPages} query={query} sort={sort} origin={origin} />
          </div>
          <div className="order-1 lg:sticky lg:top-24 lg:order-2 lg:self-start">
            <div className="relative rounded-lg border border-border bg-surface p-2 sm:p-3">
              <div className="absolute inset-x-5 top-5 z-20 lg:hidden">
                <SearchBar
                  action={ROUTES.stations}
                  defaultValue={query}
                  floating
                  suggestions={stations}
                  className="mx-auto"
                />
              </div>
              <StationMapShell stations={paginatedStations} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function parseOrigin(lat?: string, lng?: string): LatLngLiteral | undefined {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLng) &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLng >= -180 &&
    parsedLng <= 180
  ) {
    return { lat: parsedLat, lng: parsedLng };
  }

  return undefined;
}

function Pagination({
  currentPage,
  totalPages,
  query,
  sort,
  origin,
  className = "",
}: {
  currentPage: number;
  totalPages: number;
  query: string;
  sort: StationSort;
  origin?: LatLngLiteral;
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
      <PaginationLink page={currentPage - 1} disabled={currentPage === 1} query={query} sort={sort} origin={origin}>
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
            origin={origin}
          >
            {page}
          </PaginationLink>
        ))}
      </div>
      <PaginationLink page={currentPage + 1} disabled={currentPage === totalPages} query={query} sort={sort} origin={origin}>
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
  origin,
  children,
  active,
  compact,
  disabled,
}: {
  page: number;
  query: string;
  sort: StationSort;
  origin?: LatLngLiteral;
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
  if (sort !== "distance") {
    params.set("sort", sort);
  }
  if (origin) {
    params.set("lat", String(origin.lat));
    params.set("lng", String(origin.lng));
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
  return <GoogleMap stations={stations} selectedStationId={stations[0]?.id} />;
}
