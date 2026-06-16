export default function Loading() {
  return (
    <section className="mx-0 max-w-[24rem] px-4 py-8 sm:mx-auto sm:max-w-7xl sm:px-6 sm:py-10 lg:px-8">
      <div className="h-9 w-64 max-w-full animate-pulse rounded-lg bg-border" />
      <div className="mt-6 grid gap-4">
        <div className="h-36 animate-pulse rounded-lg bg-border" />
        <div className="h-36 animate-pulse rounded-lg bg-border" />
      </div>
    </section>
  );
}
