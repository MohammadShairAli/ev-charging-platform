import { MAX_SAVED_CARS, normalizeStoredCars } from "@/src/lib/local-storage";
import { updateAuthCars } from "@/src/services/auth.service";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const body = await request.json() as { cars?: unknown };

    if (!accessToken) {
      return Response.json({ message: "Login is required." }, { status: 401 });
    }

    const cars = normalizeStoredCars(body.cars);
    if (cars.length > MAX_SAVED_CARS) {
      return Response.json(
        { message: `You can save up to ${MAX_SAVED_CARS} cars. Remove one to add another.` },
        { status: 400 },
      );
    }

    const user = await updateAuthCars(accessToken, cars);

    return Response.json({ user });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Cars could not be saved." },
      { status: 400 },
    );
  }
}
