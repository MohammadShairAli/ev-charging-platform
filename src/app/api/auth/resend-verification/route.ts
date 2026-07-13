import { resendSignupVerification } from "@/src/services/auth.service";
import { sendVerificationEmail } from "@/src/services/mail.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      email?: string;
      redirectTo?: string;
    };

    if (!body.email || !body.redirectTo) {
      return Response.json({ message: "Email and redirect URL are required." }, { status: 400 });
    }

    const verification = await resendSignupVerification({
      email: body.email,
      redirectTo: body.redirectTo,
    });
    await sendVerificationEmail({
      to: body.email,
      verifyUrl: verification.verifyUrl,
    });

    return Response.json({ message: "Verification email sent from the app SMTP account. Check your inbox and spam folder." });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Verification email could not be resent." },
      { status: 400 },
    );
  }
}
