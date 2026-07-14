import { COPY } from "@/src/lib/constants";
import { stationsService } from "@/src/services/stations.service";
import type { LatLngLiteral, StationSort } from "@/src/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || undefined;
    const sort = (url.searchParams.get("sort") || undefined) as StationSort | undefined;
    const origin = parseOrigin(url.searchParams.get("lat"), url.searchParams.get("lng"));
    const stations = await stationsService.list({ q, sort, origin });

    return Response.json({ stations });
  } catch {
    return Response.json({ message: COPY.apiUnavailable }, { status: 503 });
  }
}

function parseOrigin(lat: string | null, lng: string | null): LatLngLiteral | undefined {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLng) &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLng >= -180 &&
    parsedLng <= 180
  ) {
    return { lat: parsedLat, lng: parsedLng };
  }

  return undefined;
}
