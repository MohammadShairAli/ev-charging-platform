import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "@/src/lib/constants";
import { updateAuthPassword, verifyAuthEmail } from "@/src/services/auth.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      tokenHash?: string;
      type?: string;
      password?: string;
    };

    if (!body.tokenHash || !body.type || !body.password) {
      return Response.json({ message: "Reset token and new password are required." }, { status: 400 });
    }

    if (body.password.length < 6) {
      return Response.json({ message: "Password must be at least 6 characters." }, { status: 400 });
    }

    const session = await verifyAuthEmail(body.tokenHash, body.type);

    if (!session.access_token) {
      return Response.json({ message: "Password reset session could not be created." }, { status: 400 });
    }

    await updateAuthPassword(session.access_token, body.password);

    const response = Response.json({ session, message: "Password updated. You are signed in." });
    response.headers.append("Set-Cookie", `${LEGACY_AUTH_COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0`);
    response.headers.append("Set-Cookie", `${AUTH_COOKIE_NAME}=auth; Path=/; SameSite=Lax`);

    return response;
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Password reset failed." },
      { status: 400 },
    );
  }
}
