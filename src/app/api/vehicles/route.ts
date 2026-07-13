import { COPY } from "@/src/lib/constants";
import { getVehiclePage, type VehicleCategory, type VehicleSort } from "@/src/services/vehicles.service";

export const dynamic = "force-dynamic";

const validCategories: VehicleCategory[] = ["All", "EV", "PHEV", "REEV", "HEV"];
const validSorts: VehicleSort[] = ["name", "range-desc", "range-asc", "battery-desc", "battery-asc"];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const categoryParam = url.searchParams.get("category") || "All";
    const category = validCategories.includes(categoryParam as VehicleCategory)
      ? categoryParam as VehicleCategory
      : "All";
    const sortParam = url.searchParams.get("sort") || "name";
    const sort = validSorts.includes(sortParam as VehicleSort) ? sortParam as VehicleSort : "name";

    const data = await getVehiclePage({
      q: url.searchParams.get("q") || undefined,
      category,
      sort,
      page: Number(url.searchParams.get("page") || "1"),
      pageSize: Number(url.searchParams.get("pageSize") || "9"),
    });

    return Response.json(data);
  } catch {
    return Response.json({ message: COPY.apiUnavailable }, { status: 503 });
  }
}
