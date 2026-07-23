export const PROFILE_STORAGE_KEY = "ev-charging-profile";
export const PENDING_SIGNUP_CARS_KEY = "ev-pending-signup-cars";
export const TRIP_DRAFT_STORAGE_KEY = "ev-trip-draft";
export const MAX_SAVED_CARS = 5;

export type StoredCar = {
  id: string;
  make: string;
  model: string;
  variant: string;
  kind: "EV" | "PHEV/REEV";
  powertrain?: "EV" | "PHEV" | "REEV";
  rangeKm: number;
  batteryCapacityKwh?: number;
};

export type StoredProfile = {
  personal?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  car?: {
    make?: string;
    model?: string;
    variant?: string;
    kind?: "EV" | "PHEV/REEV";
    rangeKm?: number;
  };
  cars?: StoredCar[];
};

export type StoredTripDraft = {
  start: string;
  end: string;
  rangeKm: number;
  currentChargePercent: number;
};

export function normalizeStoredCars(value: unknown): StoredCar[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((car) => {
    if (!car || typeof car !== "object") {
      return [];
    }

    const candidate = car as Partial<StoredCar>;
    const rangeKm = Number(candidate.rangeKm);
    const batteryCapacityKwh = Number(candidate.batteryCapacityKwh);

    if (
      !candidate.id
      || !candidate.make
      || !candidate.model
      || !["EV", "PHEV/REEV"].includes(candidate.kind || "")
      || !Number.isFinite(rangeKm)
      || rangeKm <= 0
    ) {
      return [];
    }

    return [{
      id: candidate.id,
      make: candidate.make,
      model: candidate.model,
      variant: candidate.variant || "",
      kind: candidate.kind as StoredCar["kind"],
      ...(candidate.powertrain && ["EV", "PHEV", "REEV"].includes(candidate.powertrain)
        ? { powertrain: candidate.powertrain }
        : {}),
      rangeKm,
      ...(Number.isFinite(batteryCapacityKwh) && batteryCapacityKwh > 0 ? { batteryCapacityKwh } : {}),
    }];
  });
}
