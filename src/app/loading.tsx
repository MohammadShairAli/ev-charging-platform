export default function Loading() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="h-8 w-64 animate-pulse rounded-md bg-border" />
      <div className="mt-6 grid gap-4">
        <div className="h-32 animate-pulse rounded-md bg-border" />
        <div className="h-32 animate-pulse rounded-md bg-border" />
      </div>
    </section>
  );
}
