"use client";

import { useState } from "react";
import { VehicleSelector, type PlannerVehicle } from "@/src/components/trip/VehicleSelector";
import { AppIcon } from "@/src/components/ui/AppIcon";
import { MAX_SAVED_CARS, type StoredCar } from "@/src/lib/local-storage";

type SavedCarsEditorProps = {
  cars: StoredCar[];
  onChange: (cars: StoredCar[]) => void;
};

export function SavedCarsEditor({ cars, onChange }: SavedCarsEditorProps) {
  const [query, setQuery] = useState("");
  const limitReached = cars.length >= MAX_SAVED_CARS;

  function addVehicle(vehicle: PlannerVehicle) {
    const car: StoredCar = {
      id: vehicle.id,
      make: vehicle.brand,
      model: vehicle.model,
      variant: vehicle.variant,
      kind: vehicle.kind,
      powertrain: vehicle.powertrain,
      rangeKm: vehicle.rangeKm,
      batteryCapacityKwh: vehicle.batteryCapacityKwh,
    };

    if (!limitReached && !cars.some((savedCar) => savedCar.id === car.id)) {
      onChange([...cars, car]);
    }
    setQuery("");
  }

  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/30 text-primary">
          <AppIcon name="electric_car" className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold text-foreground">Your cars</h3>
          <p className="text-xs text-muted">Add up to {MAX_SAVED_CARS} rechargeable cars.</p>
        </div>
        <span className="ml-auto shrink-0 text-xs font-semibold text-muted">
          {cars.length}/{MAX_SAVED_CARS}
        </span>
      </div>

      {cars.length ? (
        <ul className="mt-4 grid gap-2">
          {cars.map((car) => (
            <li
              key={car.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-secondary px-3 py-3"
            >
              <AppIcon name="directions_car" className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {[car.make, car.model, car.variant].filter(Boolean).join(" ")}
                </p>
                <p className="mt-0.5 text-xs text-muted">{car.kind} · {car.rangeKm} km</p>
              </div>
              <button
                type="button"
                onClick={() => onChange(cars.filter((savedCar) => savedCar.id !== car.id))}
                aria-label={`Remove ${car.make} ${car.model}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary"
              >
                <AppIcon name="close" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted">
          No cars added yet.
        </p>
      )}

      {limitReached ? (
        <p role="alert" className="mt-4 rounded-lg border border-primary/40 bg-secondary p-3 text-sm leading-6 text-foreground">
          You already have {MAX_SAVED_CARS} cars. Remove one to add another.
        </p>
      ) : (
        <div className="mt-4">
          <VehicleSelector
            label="Add a car"
            value={query}
            onValueChange={setQuery}
            onSelect={addVehicle}
          />
        </div>
      )}
    </section>
  );
}
