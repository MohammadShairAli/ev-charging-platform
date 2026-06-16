import { COPY } from "@/src/lib/constants";
import { stationsService } from "@/src/services/stations.service";
import type { StationSort } from "@/src/types";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || undefined;
    const sort = (url.searchParams.get("sort") || undefined) as StationSort | undefined;
    const stations = await stationsService.list({ q, sort });

    return Response.json({ stations });
  } catch {
    return Response.json({ message: COPY.apiUnavailable }, { status: 503 });
  }
}
