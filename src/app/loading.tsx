import Image from "next/image";

export default function Loading() {
  return (
    <section className="mx-auto grid min-h-[50vh] max-w-7xl place-items-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center">
          <Image src="/icon.png" alt="" width={56} height={56} className="animate-pulse object-contain" />
        </div>
        <p className="mt-4 text-sm font-semibold text-primary">Loading nearby chargers...</p>
      </div>
    </section>
  );
}
