"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "@/src/components/shared/SearchBar";
import { ROUTES } from "@/src/lib/constants";
import type { StationSort } from "@/src/types";

type StationsToolbarProps = {
  query: string;
  sort: StationSort;
};

export function StationsToolbar({ query, sort }: StationsToolbarProps) {
  const router = useRouter();
  const params = useSearchParams();

  function updateSort(nextSort: StationSort) {
    const nextParams = new URLSearchParams(params.toString());

    if (query) {
      nextParams.set("q", query);
    } else {
      nextParams.delete("q");
    }

    if (nextSort === "name") {
      nextParams.delete("sort");
    } else {
      nextParams.set("sort", nextSort);
    }

    nextParams.delete("page");
    const nextQuery = nextParams.toString();
    router.push(nextQuery ? `${ROUTES.stations}?${nextQuery}` : ROUTES.stations);
  }

  return (
    <div className="grid gap-3 rounded-lg border-0 bg-transparent p-0 sm:border sm:border-border sm:bg-surface sm:p-3 md:grid-cols-[1fr_280px]">
      <SearchBar action={ROUTES.stations} defaultValue={query} compact className="shadow-none" />
      <div>
        <label className="sr-only" htmlFor="sort">
          Sort stations
        </label>
        <select
          id="sort"
          name="sort"
          value={sort}
          onChange={(event) => updateSort(event.target.value as StationSort)}
          className="min-h-12 w-full rounded-lg border border-border bg-secondary px-3 text-base text-foreground sm:text-sm"
        >
          <option value="name">Sort by name</option>
          <option value="rating">Sort by rating</option>
          <option value="distance">Sort by distance</option>
        </select>
      </div>
    </div>
  );
}
