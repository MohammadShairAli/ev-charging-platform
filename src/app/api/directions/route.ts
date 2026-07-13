import { COPY } from "@/src/lib/constants";
import { directionsService } from "@/src/services/directions.service";
import type { DirectionsRequest } from "@/src/types";

export const dynamic = "force-dynamic";

function isCoordinate(value: unknown): value is { lat: number; lng: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { lat?: unknown }).lat === "number" &&
    typeof (value as { lng?: unknown }).lng === "number"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<DirectionsRequest>;

    if (!isCoordinate(body.origin) || !isCoordinate(body.destination)) {
      return Response.json({ message: "Origin and destination coordinates are required." }, { status: 400 });
    }

    const directions = await directionsService.route({
      origin: body.origin,
      destination: body.destination,
    });

    return Response.json({ directions });
  } catch {
    return Response.json({ message: COPY.directionsUnavailable }, { status: 503 });
  }
}
