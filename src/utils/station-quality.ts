import type { Station } from "@/src/types";

const chargingWords = [
  "charging station",
  "ev charging",
  "electric vehicle charging",
  "charger",
  "chargers",
  "charge point",
  "chargepoint",
  "ev station",
  "evse",
  "supercharger",
  "destination charging",
];

const nonChargingBusinessWords = [
  "scooter",
  "scooters",
  "bike",
  "bikes",
  "motorcycle",
  "motorcycles",
  "autos",
  "auto parts",
  "showroom",
  "dealer",
  "dealership",
  "workshop",
  "repair",
  "service center",
  "spare parts",
  "parts",
    
];

function stationText(station: Pick<Station, "name" | "address" | "operator">) {
  return [station.name, station.address, station.operator].filter(Boolean).join(" ").toLowerCase();
}

function businessText(station: Pick<Station, "name" | "operator">) {
  return [station.name, station.operator].filter(Boolean).join(" ").toLowerCase();
}

export function isLikelyChargingStation(station: Pick<Station, "name" | "address" | "operator">) {
  const text = stationText(station);
  const business = businessText(station);
  const hasChargingWord = chargingWords.some((word) => text.includes(word));
  const looksLikeNonChargingBusiness = nonChargingBusinessWords.some((word) => business.includes(word));

  if (looksLikeNonChargingBusiness) {
    return false;
  }

  return hasChargingWord;
}

export function isStationInPakistan(
  station: Pick<Station, "address" | "latitude" | "longitude">,
) {
  const address = station.address?.toLowerCase() || "";

  if (/\bpakistan\b/.test(address)) {
    return true;
  }

  if (/\b(india|bharat|afghanistan|iran|china)\b/.test(address)) {
    return false;
  }

  const latitude = station.latitude === null ? Number.NaN : Number(station.latitude);
  const longitude = station.longitude === null ? Number.NaN : Number(station.longitude);

  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= 23.4
    && latitude <= 37.2
    && longitude >= 60.7
    && longitude <= 77.2;
}
