import { createSignupVerificationLink } from "@/src/services/auth.service";
import { uploadProfileImage } from "@/src/services/cloudinary.service";
import { sendVerificationEmail } from "@/src/services/mail.service";
import { MAX_SAVED_CARS, normalizeStoredCars } from "@/src/lib/local-storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      password?: string;
      image?: string | null;
      cars?: unknown;
      redirectTo?: string;
    };

    if (!body.firstName || !body.lastName || !body.phone || !body.email || !body.password || !body.redirectTo) {
      return Response.json({ message: "First name, last name, phone number, email, and password are required." }, { status: 400 });
    }

    const cars = normalizeStoredCars(body.cars);
    if (!cars.length) {
      return Response.json({ message: "Add at least one car before creating your account." }, { status: 400 });
    }
    if (cars.length > MAX_SAVED_CARS) {
      return Response.json(
        { message: `You can add up to ${MAX_SAVED_CARS} cars. Remove one to continue.` },
        { status: 400 },
      );
    }

    const avatarUrl = await uploadProfileImage(body.image);
    const signup = await createSignupVerificationLink({
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email,
      password: body.password,
      avatarUrl,
      cars,
      redirectTo: body.redirectTo,
    });
    await sendVerificationEmail({
      to: body.email,
      name: `${body.firstName} ${body.lastName}`.trim(),
      verifyUrl: signup.verifyUrl,
    });

    return Response.json({
      user: signup.user,
      session: null,
      message: "Signup created. Verification email sent from the app SMTP account.",
    });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Signup failed." }, { status: 400 });
  }
}
