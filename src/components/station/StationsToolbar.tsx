import { SearchBar } from "@/src/components/shared/SearchBar";
import { ROUTES } from "@/src/lib/constants";
import type { StationSort } from "@/src/types";

type StationsToolbarProps = {
  query: string;
  sort: StationSort;
};

export function StationsToolbar({ query, sort }: StationsToolbarProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-surface p-3 shadow-[0_16px_38px_rgba(7,21,18,0.07)] md:grid-cols-[1fr_280px]">
      <SearchBar action={ROUTES.stations} defaultValue={query} compact />
      <form action={ROUTES.stations} className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input type="hidden" name="q" value={query} />
        <label className="sr-only" htmlFor="sort">
          Sort stations
        </label>
        <select
          id="sort"
          name="sort"
          defaultValue={sort}
          className="min-h-12 w-full rounded-lg border border-border bg-secondary px-3 text-base text-foreground shadow-sm sm:text-sm"
        >
          <option value="name">Sort by name</option>
          <option value="rating">Sort by rating</option>
          <option value="distance">Sort by distance</option>
        </select>
        <button
          type="submit"
          className="min-h-12 rounded-lg border border-border bg-ink px-4 text-sm font-semibold text-secondary transition hover:bg-primary"
        >
          Apply
        </button>
      </form>
    </div>
  );
}
