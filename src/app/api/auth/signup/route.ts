import { createSignupVerificationLink } from "@/src/services/auth.service";
import { uploadProfileImage } from "@/src/services/cloudinary.service";
import { sendVerificationEmail } from "@/src/services/mail.service";

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
      redirectTo?: string;
    };

    if (!body.firstName || !body.lastName || !body.phone || !body.email || !body.password || !body.redirectTo) {
      return Response.json({ message: "First name, last name, phone number, email, and password are required." }, { status: 400 });
    }

    const avatarUrl = await uploadProfileImage(body.image);
    const signup = await createSignupVerificationLink({
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email,
      password: body.password,
      avatarUrl,
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
