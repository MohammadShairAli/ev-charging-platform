import { ButtonLink } from "@/src/components/ui/ButtonLink";

export default function StationNotFound() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">Station not found</h1>
      <p className="mt-3 text-sm text-muted">The charging station may have been removed or the link is incorrect.</p>
      <div className="mt-6">
        <ButtonLink href="/charging-stations">Browse Stations</ButtonLink>
      </div>
    </section>
  );
}
