import { ButtonLink } from "@/src/components/ui/ButtonLink";

export default function StationNotFound() {
  return (
    <section className="mx-0 max-w-[24rem] px-4 py-16 text-center sm:mx-auto sm:max-w-3xl sm:px-6 lg:px-8">
      <div className="rounded-lg border border-border bg-surface p-8 shadow-[0_18px_45px_rgba(7,21,18,0.08)]">
        <p className="text-sm font-semibold text-primary">Directory lookup</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Station not found</h1>
        <p className="mt-3 text-sm text-muted">The charging station may have been removed or the link is incorrect.</p>
      </div>
      <div className="mx-auto mt-6 max-w-xs">
        <ButtonLink href="/charging-stations">Browse Stations</ButtonLink>
      </div>
    </section>
  );
}
