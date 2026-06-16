"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { ROUTES } from "@/src/lib/constants";

type SearchBarProps = {
  action?: string;
  defaultValue?: string;
  compact?: boolean;
  className?: string;
};

export function SearchBar({ action = ROUTES.stations, defaultValue = "", compact, className = "" }: SearchBarProps) {
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

    const nextQuery = nextParams.toString();
    router.push(nextQuery ? `${action}?${nextQuery}` : action);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`grid w-full gap-2 rounded-lg border border-border bg-secondary/95 p-1.5 shadow-[0_18px_45px_rgba(7,21,18,0.12)] sm:grid-cols-[1fr_auto] ${compact ? "max-w-2xl" : "max-w-3xl"} ${className}`}
    >
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by city, address, or operator"
        className="min-h-12 min-w-0 rounded-lg border border-transparent bg-transparent px-4 text-base text-foreground placeholder:text-muted focus:border-accent/50 sm:text-sm"
      />
      <button
        type="submit"
        className="min-h-12 rounded-lg bg-[linear-gradient(135deg,var(--primary),#00a889)] px-5 text-sm font-semibold text-secondary shadow-[0_12px_26px_rgba(0,194,168,0.22)] transition hover:brightness-105"
      >
        Search
      </button>
    </form>
  );
}
