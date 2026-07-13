import { COPY } from "@/src/lib/constants";
import { googleService } from "@/src/services/google.service";
import { stationsService } from "@/src/services/stations.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || "Pakistan";
    const localStations = await stationsService.list({ q });

    if (localStations.length) {
      return Response.json({ stations: localStations, source: "database" });
    }

    const googleStations = await googleService.searchEvStations(q);

    try {
      await stationsService.saveFromGoogle(googleStations);
    } catch {
      return Response.json({ stations: googleStations, source: "google" });
    }

    return Response.json({ stations: googleStations, source: "google" });
  } catch {
    return Response.json({ message: COPY.apiUnavailable }, { status: 503 });
  }
}
