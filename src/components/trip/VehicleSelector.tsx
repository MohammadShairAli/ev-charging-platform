"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/src/components/ui/AppIcon";

export type PlannerVehicle = {
  id: string;
  brand: string;
  model: string;
  variant: string;
  rangeKm: number;
  kind: "EV" | "PHEV/REEV";
};

type VehicleSelectorProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (vehicle: PlannerVehicle) => void;
};

const VEHICLE_FILES = [
  { url: "/Car_data/ev.csv", kind: "EV" as const, rangeColumn: "Range" },
  { url: "/Car_data/phev_and_reev.csv", kind: "PHEV/REEV" as const, rangeColumn: "Pure Electric Range" },
];

function parseCsvRow(row: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];

    if (character === '"') {
      if (quoted && row[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function parseVehicles(csv: string, kind: PlannerVehicle["kind"], rangeColumn: string) {
  const rows = csv.trim().split(/\r?\n/).filter(Boolean);
  const headers = parseCsvRow(rows[0] || "");

  return rows.slice(1).reduce<PlannerVehicle[]>((vehicles, row, index) => {
    const values = parseCsvRow(row);
    const record = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] || ""]));
    const rangeKm = Number.parseFloat(record[rangeColumn]?.replace(/,/g, "") || "");

    if (!record.Brand || !record.Model || !Number.isFinite(rangeKm) || rangeKm <= 0) {
      return vehicles;
    }

    vehicles.push({
      id: `${kind}-${record.Brand}-${record.Model}-${record.Variant || index}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      brand: record.Brand,
      model: record.Model,
      variant: record.Variant || "Standard",
      rangeKm,
      kind,
    });

    return vehicles;
  }, []);
}

export function vehicleLabel(vehicle: Pick<PlannerVehicle, "brand" | "model" | "variant">) {
  return [vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean).join(" ");
}

export function VehicleSelector({ value, onValueChange, onSelect }: VehicleSelectorProps) {
  const [vehicles, setVehicles] = useState<PlannerVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.all(
      VEHICLE_FILES.map(async (file) => {
        const response = await fetch(file.url);

        if (!response.ok) {
          throw new Error("Vehicle data could not be loaded.");
        }

        return parseVehicles(await response.text(), file.kind, file.rangeColumn);
      }),
    ).then((groups) => {
      if (!cancelled) {
        setVehicles(groups.flat().sort((first, second) => vehicleLabel(first).localeCompare(vehicleLabel(second))));
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setLoadError("Vehicle list is temporarily unavailable. Refresh and try again.");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const matches = useMemo(() => {
    const terms = value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const filtered = terms.length
      ? vehicles.filter((vehicle) => {
          const searchable = `${vehicle.brand} ${vehicle.model} ${vehicle.variant} ${vehicle.kind}`.toLowerCase();
          return terms.every((term) => searchable.includes(term));
        })
      : vehicles;

    return filtered.slice(0, 10);
  }, [value, vehicles]);

  function choose(vehicle: PlannerVehicle) {
    onSelect(vehicle);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && activeIndex >= 0 && matches[activeIndex]) {
      event.preventDefault();
      choose(matches[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div>
      <label htmlFor="trip-vehicle" className="text-sm font-semibold text-foreground">Your car</label>
      <div className="relative mt-2">
        <AppIcon name="directions_car" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          id="trip-vehicle"
          type="search"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls="trip-vehicle-options"
          aria-activedescendant={activeIndex >= 0 ? `trip-vehicle-option-${activeIndex}` : undefined}
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimeoutRef.current = window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "Loading cars..." : "Search brand, model, or variant"}
          disabled={loading || Boolean(loadError)}
          className="min-h-12 w-full rounded-xl border border-border bg-secondary pl-11 pr-4 text-base text-foreground placeholder:text-muted/70 disabled:cursor-wait disabled:opacity-70"
        />

        {open && !loading && !loadError ? (
          <ul id="trip-vehicle-options" role="listbox" className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-secondary p-1 shadow-xl">
            {matches.length ? matches.map((vehicle, index) => (
              <li key={vehicle.id} role="presentation">
                <button
                  id={`trip-vehicle-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(vehicle)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition ${index === activeIndex ? "bg-background" : "hover:bg-background"}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-foreground">{vehicleLabel(vehicle)}</span>
                    <span className="mt-0.5 block text-xs text-muted">{vehicle.kind}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-primary">{vehicle.rangeKm} km</span>
                </button>
              </li>
            )) : (
              <li className="px-3 py-3 text-sm text-muted">No matching rechargeable car found.</li>
            )}
          </ul>
        ) : null}
      </div>
      {loadError ? <p role="alert" className="mt-2 text-xs leading-5 text-muted">{loadError}</p> : (
        <p className="mt-2 text-xs leading-5 text-muted">Search the EV and plug-in hybrid database, then select your exact variant.</p>
      )}
    </div>
  );
}
