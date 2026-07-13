import { createPasswordRecoveryLink } from "@/src/services/auth.service";
import { sendPasswordResetEmail } from "@/src/services/mail.service";

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

    const recovery = await createPasswordRecoveryLink({
      email: body.email,
      redirectTo: body.redirectTo,
    });
    await sendPasswordResetEmail({
      to: body.email,
      resetUrl: recovery.resetUrl,
    });

    return Response.json({ message: "Password reset email sent. Check your inbox and spam folder." });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Password reset email could not be sent." },
      { status: 400 },
    );
  }
}
