"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { ROUTES } from "@/src/lib/constants";
import type { Station } from "@/src/types";

type SearchBarProps = {
  action?: string;
  defaultValue?: string;
  compact?: boolean;
  floating?: boolean;
  suggestions?: Station[];
  className?: string;
};

type SearchSuggestion = {
  id: string;
  label: string;
  detail: string;
  value: string;
  placeId?: string | null;
  lat?: number;
  lng?: number;
};

export function SearchBar({
  action = ROUTES.stations,
  defaultValue = "",
  compact,
  floating,
  suggestions = [],
  className = "",
}: SearchBarProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(defaultValue);
  const [remoteSuggestions, setRemoteSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const suggestionsId = useId();

  const matchingSuggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length < 2) {
      return [];
    }

    const localSuggestions = suggestions.map((station) => ({
      id: `station-${station.id}`,
      label: station.name,
      detail: [station.operator, station.address].filter(Boolean).join(" · "),
      value: station.name,
      lat: station.latitude ?? undefined,
      lng: station.longitude ?? undefined,
    }));
    const matches = [...remoteSuggestions, ...localSuggestions].filter((suggestion, index, allSuggestions) => (
      allSuggestions.findIndex((candidate) => candidate.id === suggestion.id) === index
      && [suggestion.label, suggestion.detail]
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    ));

    return matches.slice(0, 6);
  }, [query, remoteSuggestions, suggestions]);

  useEffect(() => {
    if (!hasInteracted || query.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json() as { suggestions?: SearchSuggestion[] };
        setRemoteSuggestions(data.suggestions || []);
      } catch {
        // Already-loaded suggestions remain available if the live request fails.
      }
    }, 120);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [hasInteracted, query]);

  useEffect(() => () => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
    }
  }, []);

  function navigate(nextValue: string, origin?: { lat: number; lng: number }) {
    const nextParams = new URLSearchParams(params.toString());
    const trimmedQuery = nextValue.trim();

    if (trimmedQuery) {
      nextParams.set("q", trimmedQuery);
    } else {
      nextParams.delete("q");
    }
    nextParams.delete("page");
    if (origin) {
      nextParams.set("lat", String(origin.lat));
      nextParams.set("lng", String(origin.lng));
    } else {
      nextParams.delete("lat");
      nextParams.delete("lng");
    }

    const nextQuery = nextParams.toString();
    router.push(nextQuery ? `${action}?${nextQuery}` : action);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpen(false);
    navigate(query);
  }

  async function chooseSuggestion(suggestion: SearchSuggestion) {
    setQuery(suggestion.value);
    setOpen(false);
    setActiveIndex(-1);

    if (typeof suggestion.lat === "number" && typeof suggestion.lng === "number") {
      navigate(suggestion.value, { lat: suggestion.lat, lng: suggestion.lng });
      return;
    }

    setResolvingLocation(true);

    try {
      const locationParams = new URLSearchParams({ q: suggestion.value });
      if (suggestion.placeId) {
        locationParams.set("placeId", suggestion.placeId);
      }
      const response = await fetch(`/api/search/location?${locationParams.toString()}`);

      if (!response.ok) {
        throw new Error("Location could not be resolved.");
      }

      const location = await response.json() as {
        name?: string;
        lat: number;
        lng: number;
      };
      navigate(suggestion.value, { lat: location.lat, lng: location.lng });
    } catch {
      navigate(suggestion.value);
    } finally {
      setResolvingLocation(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || !matchingSuggestions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % matchingSuggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? matchingSuggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void chooseSuggestion(matchingSuggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={`relative w-full items-center gap-2 border border-border p-1.5 ${
        floating
          ? "grid grid-cols-[minmax(0,1fr)_auto] rounded-2xl bg-surface/5 shadow-[0_14px_40px_rgba(0,0,0,0.18)] backdrop-blur-md"
          : "hidden rounded-lg bg-surface sm:grid-cols-[1fr_auto] lg:grid"
      } ${compact ? "max-w-2xl" : "max-w-3xl"} ${className}`}
    >
      <input
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;

          setQuery(nextQuery);
          setHasInteracted(true);
          setOpen(nextQuery.trim().length >= 2);
          setActiveIndex(-1);

          if (nextQuery.trim().length < 2) {
            setRemoteSuggestions([]);
          }
        }}
        onFocus={() => {
          setHasInteracted(true);
          setOpen(query.trim().length >= 2);
        }}
        onBlur={() => {
          blurTimeoutRef.current = window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
        aria-label="Search charging stations"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && matchingSuggestions.length > 0}
        aria-controls={suggestionsId}
        aria-activedescendant={activeIndex >= 0 ? `${suggestionsId}-option-${activeIndex}` : undefined}
        aria-busy={resolvingLocation}
        autoComplete="off"
        placeholder="Search a place or area"
        className={`min-h-12 min-w-0 border border-border bg-transparent text-base text-foreground placeholder:text-muted focus:border-border sm:text-sm ${
          floating ? "rounded-xl px-1 sm:px-2" : "rounded-lg px-4"
        }`}
      />
      <button
        type="submit"
        aria-label="Search"
        disabled={resolvingLocation}
        className={`min-h-12 bg-primary text-sm font-bold text-secondary transition hover:bg-primary-hover ${
          floating ? "grid min-w-12 place-items-center rounded-xl px-3" : "rounded-lg px-5"
        } disabled:cursor-wait disabled:opacity-70`}
      >
        {floating ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m15.5 15.5 5 5" strokeLinecap="round" />
          </svg>
        ) : (
          "Search"
        )}
      </button>
      {open && matchingSuggestions.length ? (
        <ul
          id={suggestionsId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[70] mt-2 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 text-left shadow-xl"
        >
          {matchingSuggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="presentation">
              <button
                id={`${suggestionsId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => void chooseSuggestion(suggestion)}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 transition ${
                  index === activeIndex ? "bg-background" : "hover:bg-background"
                }`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 fill-none stroke-black stroke-[1.8]">
                  <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
                  <circle cx="12" cy="10" r="2" />
                </svg>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{suggestion.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {suggestion.detail}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
