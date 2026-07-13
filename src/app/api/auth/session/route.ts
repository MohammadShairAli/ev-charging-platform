import { getAuthUser } from "@/src/services/auth.service";

export const dynamic = "force-dynamic";

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUserMetadata(metadata: Record<string, unknown> | undefined) {
  const fullName = stringValue(metadata?.full_name) || stringValue(metadata?.name);
  const nameParts = fullName.split(" ").filter(Boolean);
  const firstName = stringValue(metadata?.first_name) || stringValue(metadata?.given_name) || nameParts[0] || "";
  const lastName = stringValue(metadata?.last_name) || stringValue(metadata?.family_name) || nameParts.slice(1).join(" ");
  const avatar = stringValue(metadata?.avatar_data_url) || stringValue(metadata?.avatar_url) || stringValue(metadata?.picture);

  return {
    ...metadata,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName || [firstName, lastName].filter(Boolean).join(" "),
    avatar_data_url: avatar,
  };
}

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!accessToken) {
      return Response.json({ message: "Missing access token." }, { status: 401 });
    }

    const user = await getAuthUser(accessToken);

    return Response.json({
      user: {
        ...user,
        user_metadata: normalizeUserMetadata(user.user_metadata),
      },
    });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Could not load authenticated user." },
      { status: 400 },
    );
  }
}
