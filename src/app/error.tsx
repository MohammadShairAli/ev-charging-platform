"use client";

import { ButtonLink } from "@/src/components/ui/ButtonLink";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-0 max-w-[24rem] px-4 py-16 text-center sm:mx-auto sm:max-w-3xl sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted">Please try again, or return to the station directory.</p>
      <div className="mt-6 grid gap-3 sm:flex sm:justify-center">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-lg bg-[linear-gradient(135deg,var(--primary),#00a889)] px-4 py-2.5 text-sm font-semibold text-secondary shadow-[0_14px_35px_rgba(11,91,58,0.22)] transition hover:brightness-105"
        >
          Try Again
        </button>
        <ButtonLink href="/charging-stations" variant="secondary">Browse Stations</ButtonLink>
      </div>
    </section>
  );
}
