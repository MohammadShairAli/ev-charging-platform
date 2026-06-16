import { SearchBar } from "@/src/components/shared/SearchBar";
import { ROUTES } from "@/src/lib/constants";
import type { StationSort } from "@/src/types";

type StationsToolbarProps = {
  query: string;
  sort: StationSort;
};

export function StationsToolbar({ query, sort }: StationsToolbarProps) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-secondary p-4 md:grid-cols-[1fr_220px]">
      <SearchBar action={ROUTES.stations} defaultValue={query} compact />
      <form action={ROUTES.stations}>
        <input type="hidden" name="q" value={query} />
        <label className="sr-only" htmlFor="sort">
          Sort stations
        </label>
        <select
          id="sort"
          name="sort"
          defaultValue={sort}
          className="min-h-12 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
        >
          <option value="name">Sort by name</option>
          <option value="rating">Sort by rating</option>
          <option value="distance">Sort by distance</option>
        </select>
      </form>
    </div>
  );
}
