import { googleService } from "@/src/services/google.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const placeId = url.searchParams.get("placeId")?.trim();
  const query = url.searchParams.get("q")?.trim();

  try {
    if (placeId) {
      const result = await googleService.getPlaceLocation(placeId);
      return Response.json({
        name: result.name,
        lat: result.location.lat,
        lng: result.location.lng,
      });
    }

    if (query) {
      const location = await googleService.geocodeLocation(query);

      if (location) {
        return Response.json({
          name: query,
          lat: location.lat,
          lng: location.lng,
        });
      }
    }

    return Response.json({ message: "Location not found." }, { status: 404 });
  } catch {
    return Response.json({ message: "Location could not be resolved." }, { status: 503 });
  }
}
