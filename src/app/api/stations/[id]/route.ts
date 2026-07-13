import { COPY } from "@/src/lib/constants";
import { stationsService } from "@/src/services/stations.service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const station = await stationsService.findById(id);

    if (!station) {
      return Response.json({ message: "Station not found." }, { status: 404 });
    }

    return Response.json({ station });
  } catch {
    return Response.json({ message: COPY.apiUnavailable }, { status: 503 });
  }
}
