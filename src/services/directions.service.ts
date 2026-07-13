import { googleService } from "@/src/services/google.service";
import type { DirectionsRequest } from "@/src/types";

export class DirectionsService {
  async route(input: DirectionsRequest) {
    return googleService.getDirections(input);
  }
}

export const directionsService = new DirectionsService();
