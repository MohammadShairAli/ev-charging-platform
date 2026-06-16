import { googleService } from "@/src/services/google.service";
import type { DirectionsRequest } from "@/src/types";
import { calculateDistanceKm } from "@/src/utils/distance";

export class DirectionsService {
  async route(input: DirectionsRequest) {
    try {
      return await googleService.getDirections(input);
    } catch {
      const distanceKm = calculateDistanceKm(input.origin, input.destination);

      return {
        distanceText: `${distanceKm.toFixed(1)} km`,
        durationText: "Open Google Maps for ETA",
        polyline: null,
      };
    }
  }
}

export const directionsService = new DirectionsService();
