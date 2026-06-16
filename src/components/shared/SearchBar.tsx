"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { ROUTES } from "@/src/lib/constants";

type SearchBarProps = {
  action?: string;
  defaultValue?: string;
  compact?: boolean;
};

export function SearchBar({ action = ROUTES.stations, defaultValue = "", compact }: SearchBarProps) {
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

    router.push(`${action}?${nextParams.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className={`flex w-full gap-2 ${compact ? "max-w-2xl" : "max-w-3xl"}`}>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by city, address, or operator"
        className="min-h-12 flex-1 rounded-md border border-border bg-secondary px-4 text-sm text-foreground shadow-sm"
      />
      <button
        type="submit"
        className="min-h-12 rounded-md bg-primary px-5 text-sm font-semibold text-secondary transition hover:bg-primary-hover"
      >
        Search
      </button>
    </form>
  );
}
