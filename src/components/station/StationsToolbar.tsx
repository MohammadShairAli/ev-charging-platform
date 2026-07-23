"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "@/src/components/shared/SearchBar";
import { ROUTES } from "@/src/lib/constants";
import type { StationSort } from "@/src/types";

type StationsToolbarProps = {
  query: string;
  sort: StationSort;
  showSearch?: boolean;
};

export function StationsToolbar({ query, sort, showSearch = true }: StationsToolbarProps) {
  const router = useRouter();
  const params = useSearchParams();
  const hasLocation = params.has("lat") && params.has("lng");

  const pushSort = useCallback((nextSort: StationSort, origin?: { lat: number; lng: number }) => {
    const nextParams = new URLSearchParams(params.toString());

    if (query) {
      nextParams.set("q", query);
    } else {
      nextParams.delete("q");
    }

    if (nextSort === "distance") {
      nextParams.delete("sort");
    } else {
      nextParams.set("sort", nextSort);
    }

    if (origin) {
      nextParams.set("lat", String(origin.lat));
      nextParams.set("lng", String(origin.lng));
    } else if (nextSort !== "distance") {
      nextParams.delete("lat");
      nextParams.delete("lng");
    }

    nextParams.delete("page");
    const nextQuery = nextParams.toString();
    router.push(nextQuery ? `${ROUTES.stations}?${nextQuery}` : ROUTES.stations);
  }, [params, query, router]);

  function updateSort(nextSort: StationSort) {
    if (nextSort !== "distance" || !navigator.geolocation) {
      pushSort(nextSort);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        pushSort(nextSort, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => pushSort(nextSort),
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 8000,
      },
    );
  }

  useEffect(() => {
    if (sort !== "distance" || hasLocation || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        pushSort("distance", {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 8000,
      },
    );
  }, [hasLocation, pushSort, sort]);

  return (
    <div
      className={`gap-3 rounded-lg border-0 bg-transparent p-0 sm:border sm:border-border sm:bg-surface sm:p-3 ${
        showSearch ? "grid md:grid-cols-[1fr_280px]" : "flex justify-end"
      }`}
    >
      {showSearch ? <SearchBar action={ROUTES.stations} defaultValue={query} compact className="shadow-none" /> : null}
      <div className={showSearch ? "" : "w-full sm:max-w-[280px]"}>
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
          <option value="distance">Sort by distance</option>
          <option value="name">Sort by name</option>
          <option value="rating">Sort by rating</option>
        </select>
      </div>
    </div>
  );
}
