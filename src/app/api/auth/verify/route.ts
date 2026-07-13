import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "@/src/lib/constants";
import { verifyAuthEmail } from "@/src/services/auth.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { tokenHash?: string; type?: string };

    if (!body.tokenHash || !body.type) {
      return Response.json({ message: "Verification token is missing." }, { status: 400 });
    }

    const session = await verifyAuthEmail(body.tokenHash, body.type);
    const response = Response.json({ session, message: "Email verified." });
    response.headers.append("Set-Cookie", `${LEGACY_AUTH_COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0`);
    response.headers.append("Set-Cookie", `${AUTH_COOKIE_NAME}=auth; Path=/; SameSite=Lax`);

    return response;
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Email verification failed." }, { status: 400 });
  }
}
