import { VehicleDatabase } from "@/src/components/vehicle/VehicleDatabase";
import { requireSessionAccess } from "@/src/lib/auth-guard";
import { getVehiclePage } from "@/src/services/vehicles.service";

export const dynamic = "force-dynamic";

export default async function EvDatabasePage() {
  await requireSessionAccess();
  const initialData = await getVehiclePage();

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <section className="rounded-lg border border-border bg-surface p-5 text-foreground sm:p-7">
        <p className="text-sm font-semibold text-primary">Vehicle reference</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">EV, PHEV, REEV & HEV Database</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
          Browse electric, plug-in hybrid, range-extended, and hybrid vehicles from the local car data files.
        </p>
      </section>

      <section className="mt-5">
        <VehicleDatabase initialData={initialData} />
      </section>
    </main>
  );
}
