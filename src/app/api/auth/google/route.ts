import { lookup } from "node:dns/promises";
import { appConfig } from "@/src/lib/config";
import { googleOAuthUrl } from "@/src/services/auth.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    const redirectTo = appConfig.supabase.authRedirectUrl || `${appConfig.siteUrl || origin}/auth/callback`;
    const supabaseHost = new URL(appConfig.supabase.url).hostname;

    await lookup(supabaseHost);

    const url = googleOAuthUrl(redirectTo);

    return Response.redirect(url);
  } catch (error) {
    const loginUrl = new URL("/login", request.url);
    const message = error instanceof Error && /ENOTFOUND|queryA|querySrv|notfound|getaddrinfo/i.test(error.message)
      ? "Supabase URL is not reachable. Check SUPABASE_URL in .env and use the Project URL from Supabase settings."
      : error instanceof Error
        ? error.message
        : "Google login is unavailable.";
    loginUrl.searchParams.set("authError", message);

    return Response.redirect(loginUrl);
  }
}
