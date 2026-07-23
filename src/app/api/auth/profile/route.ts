import { updateAuthProfile } from "@/src/services/auth.service";
import { uploadProfileImage } from "@/src/services/cloudinary.service";
import { MAX_SAVED_CARS, normalizeStoredCars } from "@/src/lib/local-storage";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const body = await request.json() as {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      currentEmail?: string;
      image?: string | null;
      cars?: unknown;
      redirectTo?: string;
    };

    if (!accessToken) {
      return Response.json({ message: "Login is required." }, { status: 401 });
    }

    if (!body.firstName || !body.lastName || !body.phone || !body.redirectTo) {
      return Response.json({ message: "First name, last name, and phone number are required." }, { status: 400 });
    }

    const nextEmail = body.email?.trim();
    const currentEmail = body.currentEmail?.trim();
    const emailChanged = Boolean(nextEmail && currentEmail && nextEmail.toLowerCase() !== currentEmail.toLowerCase());
    const cars = normalizeStoredCars(body.cars);
    if (cars.length > MAX_SAVED_CARS) {
      return Response.json(
        { message: `You can save up to ${MAX_SAVED_CARS} cars. Remove one to add another.` },
        { status: 400 },
      );
    }

    const avatarUrl = await uploadProfileImage(body.image);
    const user = await updateAuthProfile({
      accessToken,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: emailChanged ? nextEmail : undefined,
      avatarUrl,
      cars,
      redirectTo: body.redirectTo,
    });

    return Response.json({
      user,
      emailVerificationRequired: emailChanged,
      message: emailChanged
        ? "Profile saved. Check the new email address and verify it before the email changes."
        : "Profile saved.",
    });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Profile update failed." }, { status: 400 });
  }
}
