"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VehiclePageResult, VehicleCategory, VehicleSort } from "@/src/services/vehicles.service";

export type VehicleRecord = {
  id: string;
  category: "EV" | "PHEV" | "REEV" | "HEV";
  brand: string;
  model: string;
  variant: string;
  image: string;
  fallbackImage: string;
  rangeKm: number | null;
  batteryKwh: number | null;
  specs: Array<{ label: string; value: string }>;
};

type VehicleDatabaseProps = {
  initialData: VehiclePageResult;
};

const categories: VehicleCategory[] = ["All", "EV", "PHEV", "REEV", "HEV"];
const sortOptions: Array<{ value: VehicleSort; label: string }> = [
  { value: "name", label: "Sort by name" },
  { value: "range-desc", label: "Range high to low" },
  { value: "range-asc", label: "Range low to high" },
  { value: "battery-desc", label: "Battery high to low" },
  { value: "battery-asc", label: "Battery low to high" },
];
const pageSize = 9;

export function VehicleDatabase({ initialData }: VehicleDatabaseProps) {
  const [data, setData] = useState(initialData);
  const [activeCategory, setActiveCategory] = useState<VehicleCategory>("All");
  const [sort, setSort] = useState<VehicleSort>("name");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const requestIdRef = useRef(0);
  const trimmedQuery = query.trim();

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timeout = window.setTimeout(async () => {
      const params = new URLSearchParams({
        category: activeCategory,
        sort,
        page: String(page),
        pageSize: String(pageSize),
      });

      if (trimmedQuery) {
        params.set("q", trimmedQuery);
      }

      setLoading(true);

      try {
        const response = await fetch(`/api/vehicles?${params.toString()}`, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Vehicle data unavailable.");
        }

        const nextData = await response.json() as VehiclePageResult;

        if (requestId === requestIdRef.current) {
          setData(nextData);
          setSuggestionsOpen(Boolean(trimmedQuery && nextData.suggestions.length));
        }
      } catch {
        if (requestId === requestIdRef.current) {
          setSuggestionsOpen(false);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, trimmedQuery ? 220 : 0);

    return () => window.clearTimeout(timeout);
  }, [activeCategory, page, sort, trimmedQuery]);

  function updateCategory(category: VehicleCategory) {
    setActiveCategory(category);
    setPage(1);
  }

  function updateSort(nextSort: VehicleSort) {
    setSort(nextSort);
    setPage(1);
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setPage(1);
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DatabaseMetric label="Vehicles" value={String(data.stats.total)} />
        <DatabaseMetric label="EV models" value={String(data.stats.ev)} />
        <DatabaseMetric label="Plug-in hybrids" value={String(data.stats.phev + data.stats.reev)} />
        <DatabaseMetric label="HEV models" value={String(data.stats.hev)} />
      </section>

      <section className="grid gap-3 rounded-lg border border-border bg-surface p-3 lg:grid-cols-[1fr_180px_210px] lg:items-start">
        <div className="relative">
          <label className="sr-only" htmlFor="vehicle-search">Search vehicles</label>
          <input
            id="vehicle-search"
            type="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            onFocus={() => setSuggestionsOpen(Boolean(trimmedQuery && data.suggestions.length))}
            onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 150)}
            placeholder="Search brand or car name..."
            className="min-h-12 w-full rounded-lg border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted/70"
          />
          {suggestionsOpen ? (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl">
              {data.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    updateQuery(suggestion);
                    setSuggestionsOpen(false);
                  }}
                  className="block min-h-10 w-full rounded-md px-3 text-left text-sm font-medium text-foreground transition hover:bg-background"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <label className="sr-only" htmlFor="vehicle-category">Vehicle type</label>
        <select
          id="vehicle-category"
          value={activeCategory}
          onChange={(event) => updateCategory(event.target.value as VehicleCategory)}
          className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm font-bold text-foreground"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="vehicle-sort">Sort vehicles</label>
        <select
          id="vehicle-sort"
          value={sort}
          onChange={(event) => updateSort(event.target.value as VehicleSort)}
          className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm font-bold text-foreground"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <p className="text-sm font-medium text-muted">
          Showing {data.vehicles.length} of {data.total} vehicles
        </p>
        {loading ? <p className="text-sm font-semibold text-primary">Updating...</p> : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.vehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </section>

      {!data.vehicles.length ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <h2 className="text-lg font-bold text-foreground">No vehicles found</h2>
          <p className="mt-2 text-sm text-muted">Try another brand, model, or category.</p>
        </div>
      ) : null}

      <VehiclePagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
    </div>
  );
}

function DatabaseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function VehicleCard({ vehicle }: { vehicle: VehicleRecord }) {
  const [imageSrc, setImageSrc] = useState(vehicle.image);
  const primarySpecs = useMemo(() => vehicle.specs.slice(0, 4), [vehicle.specs]);

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="relative aspect-[16/10] bg-surface-strong">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={`${vehicle.brand} ${vehicle.model} ${vehicle.variant}`}
          loading="lazy"
          onError={() => setImageSrc(vehicle.fallbackImage || "/icon.png")}
          className="h-full w-full object-cover"
        />
        <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-secondary">
          {vehicle.category}
        </span>
      </div>

      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{vehicle.brand}</p>
        <h2 className="mt-1 text-xl font-bold leading-7 text-foreground">
          {vehicle.model}
        </h2>
        <p className="mt-1 text-sm font-medium text-muted">{vehicle.variant}</p>

        <dl className="mt-4 grid grid-cols-2 gap-2">
          {primarySpecs.map((spec) => (
            <div key={spec.label} className="min-w-0 rounded-lg border border-border bg-background px-3 py-2">
              <dt className="truncate text-[0.68rem] font-semibold uppercase tracking-wide text-muted">{spec.label}</dt>
              <dd className="mt-1 truncate text-sm font-bold text-foreground">{spec.value || "-"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

function VehiclePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = visiblePages(page, totalPages);

  return (
    <nav className="rounded-lg border border-border bg-surface px-3 py-3" aria-label="Vehicle pages">
      <div className="mb-3 text-center text-sm font-medium text-muted">
        Page {page} of {totalPages}
      </div>
      <div className="flex items-center justify-between gap-2">
        <PaginationButton disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </PaginationButton>
        <div className="flex min-w-0 items-center justify-center gap-1">
          {pages.map((item) => (
            <PaginationButton key={item} active={item === page} compact onClick={() => onPageChange(item)}>
              {item}
            </PaginationButton>
          ))}
        </div>
        <PaginationButton disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </PaginationButton>
      </div>
    </nav>
  );
}

function PaginationButton({
  children,
  active,
  compact,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  compact?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${compact ? "h-9 w-9 px-0" : "min-h-10 px-3"} inline-flex shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
        active
          ? "bg-primary text-secondary"
          : disabled
            ? "cursor-not-allowed bg-background text-muted/45"
            : "bg-background text-foreground hover:bg-accent-soft hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function visiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  const end = Math.min(totalPages, start + 2);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
