export const PROFILE_STORAGE_KEY = "ev-charging-profile";
export const TRIP_DRAFT_STORAGE_KEY = "ev-trip-draft";

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
};

export type StoredTripDraft = {
  start: string;
  end: string;
  rangeKm: number;
  currentChargePercent: number;
};
