import type { Station } from "@/src/types";

export function stationCoordinates(station: Station) {
  if (typeof station.latitude !== "number" || typeof station.longitude !== "number") {
    return null;
  }

  return {
    lat: station.latitude,
    lng: station.longitude,
  };
}

export function googleMapsDirectionsUrl(station: Station) {
  const coordinates = stationCoordinates(station);

  if (!coordinates) {
    return null;
  }

  const destination = encodeURIComponent(`${coordinates.lat},${coordinates.lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}
