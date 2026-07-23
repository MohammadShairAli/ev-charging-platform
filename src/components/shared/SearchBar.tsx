"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { ROUTES } from "@/src/lib/constants";

type SearchBarProps = {
  action?: string;
  defaultValue?: string;
  compact?: boolean;
  floating?: boolean;
  className?: string;
};

export function SearchBar({
  action = ROUTES.stations,
  defaultValue = "",
  compact,
  floating,
  className = "",
}: SearchBarProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(defaultValue);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextParams = new URLSearchParams(params.toString());

    if (query.trim()) {
      nextParams.set("q", query.trim());
    } else {
      nextParams.delete("q");
    }
    nextParams.delete("page");

    const nextQuery = nextParams.toString();
    router.push(nextQuery ? `${action}?${nextQuery}` : action);
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={`w-full items-center gap-2 border border-border p-1.5 ${
        floating
        ? "grid grid-cols-[minmax(0,1fr)_auto] rounded-2xl bg-secondary/5 shadow-[0_14px_40px_rgba(28,28,28,0.18)] backdrop-blur-md"
          : "hidden rounded-lg bg-secondary sm:grid-cols-[1fr_auto] lg:grid"
      } ${compact ? "max-w-2xl" : "max-w-3xl"} ${className}`}
    >
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search charging stations"
        placeholder="Search by city, address, or operator"
        className={`min-h-12 min-w-0 border border-transparent bg-transparent text-base text-foreground placeholder:text-muted focus:border-accent/50 sm:text-sm ${
          floating ? "rounded-xl px-1 sm:px-2" : "rounded-lg px-4"
        }`}
      />
      <button
        type="submit"
        aria-label="Search"
        className={`min-h-12 bg-primary text-sm font-bold text-secondary transition hover:bg-primary-hover ${
          floating ? "grid min-w-12 place-items-center rounded-xl px-3" : "rounded-lg px-5"
        }`}
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
    </form>
  );
}
