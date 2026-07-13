import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "@/src/lib/constants";
import { loginWithEmail } from "@/src/services/auth.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };

    if (!body.email || !body.password) {
      return Response.json({ message: "Email and password are required." }, { status: 400 });
    }

    const session = await loginWithEmail({ email: body.email, password: body.password });
    const response = Response.json({ session });
    response.headers.append("Set-Cookie", `${LEGACY_AUTH_COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0`);
    response.headers.append("Set-Cookie", `${AUTH_COOKIE_NAME}=auth; Path=/; SameSite=Lax`);

    return response;
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Login failed." }, { status: 401 });
  }
}
