"use client";

import { ButtonLink } from "@/src/components/ui/ButtonLink";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted">Please try again, or return to the station directory.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-primary-hover"
        >
          Try Again
        </button>
        <ButtonLink href="/charging-stations">Browse Stations</ButtonLink>
      </div>
    </section>
  );
}
