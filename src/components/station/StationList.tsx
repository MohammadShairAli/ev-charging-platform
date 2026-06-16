import { EmptyState } from "@/src/components/ui/EmptyState";
import { StationCard } from "@/src/components/station/StationCard";
import { COPY } from "@/src/lib/constants";
import type { Station } from "@/src/types";

type StationListProps = {
  stations: Station[];
};

export function StationList({ stations }: StationListProps) {
  if (!stations.length) {
    return <EmptyState title="No stations found" message={COPY.noStations} />;
  }

  return (
    <div className="grid gap-4">
      {stations.map((station) => (
        <StationCard key={station.id} station={station} />
      ))}
    </div>
  );
}
