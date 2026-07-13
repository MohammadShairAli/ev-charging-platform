import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, ROUTES } from "@/src/lib/constants";

export async function requireSessionAccess() {
  const accessMode = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (accessMode !== "auth" && accessMode !== "guest") {
    redirect(ROUTES.login);
  }
}
