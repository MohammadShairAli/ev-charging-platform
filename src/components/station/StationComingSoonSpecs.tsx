import { AppIcon } from "@/src/components/ui/AppIcon";

const upcomingStationSpecs = [
  { label: "Chargers", icon: "ev_station" },
  { label: "Wait time", icon: "schedule" },
] as const;

export function StationComingSoonSpecs({ className = "" }: { className?: string }) {
  return (
    <dl className={`grid grid-cols-2 divide-x divide-border overflow-hidden rounded-xl border border-border bg-background ${className}`}>
      {upcomingStationSpecs.map((spec) => (
        <div key={spec.label} className="min-w-0 px-2 py-2.5 sm:px-3">
          <dt className="flex items-center gap-1 text-xs font-semibold text-foreground">
            <AppIcon name={spec.icon} className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{spec.label}</span>
          </dt>
          <dd className="mt-0.5 truncate pl-5 text-[0.68rem] font-medium text-muted">Coming soon</dd>
        </div>
      ))}
    </dl>
  );
}
