export const dynamic = "force-dynamic";

import { TripPlanner } from "@/src/components/trip/TripPlanner";
import { stationsService } from "@/src/services/stations.service";

export default async function PlanTripPage() {
  const stations = await stationsService.list();

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <TripPlanner stations={stations} />
    </main>
  );
}
