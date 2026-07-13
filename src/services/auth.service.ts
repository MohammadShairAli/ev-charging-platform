import { appConfig, hasSupabaseConfig } from "@/src/lib/config";

type SupabaseAuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
};

type SupabaseGeneratedLink = {
  user?: SupabaseAuthSession["user"];
  action_link?: string;
  hashed_token?: string;
  verification_type?: string;
  properties?: {
    action_link?: string;
    hashed_token?: string;
    verification_type?: string;
  };
};

type SignUpInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  avatarUrl?: string | null;
  redirectTo: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type ResendVerificationInput = {
  email: string;
  redirectTo: string;
};

type PasswordRecoveryInput = {
  email: string;
  redirectTo: string;
};

type UpdateProfileInput = {
  accessToken: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  avatarUrl?: string | null;
  redirectTo: string;
};

function requireAuthConfig() {
  if (!hasSupabaseConfig || !appConfig.supabase.anonKey) {
    throw new Error("Supabase auth configuration is missing.");
  }
}

function authHeaders() {
  requireAuthConfig();

  return {
    apikey: appConfig.supabase.anonKey,
    Authorization: `Bearer ${appConfig.supabase.anonKey}`,
    "Content-Type": "application/json",
  };
}

function adminAuthHeaders() {
  requireAuthConfig();

  if (!appConfig.supabase.serviceRoleKey) {
    throw new Error("Supabase service role key is required to generate custom verification emails.");
  }

  if (appConfig.supabase.serviceRoleKey.split(".").length !== 3) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be the legacy service_role JWT key that starts with eyJ... Do not use the sb_secret_... key for Supabase Auth verification links.");
  }

  return {
    apikey: appConfig.supabase.anonKey,
    Authorization: `Bearer ${appConfig.supabase.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function verificationUrl(input: { redirectTo: string; tokenHash?: string; type?: string; actionLink?: string }) {
  if (input.tokenHash) {
    const url = new URL(input.redirectTo);
    url.searchParams.set("token_hash", input.tokenHash);
    url.searchParams.set("type", input.type || "signup");

    return url.toString();
  }

  if (input.actionLink) {
    return input.actionLink;
  }

  throw new Error("Supabase did not return a verification token.");
}

function generatedLinkUrl(data: SupabaseGeneratedLink, redirectTo: string, fallbackType: string) {
  return verificationUrl({
    redirectTo,
    tokenHash: data.hashed_token || data.properties?.hashed_token,
    type: data.verification_type || data.properties?.verification_type || fallbackType,
    actionLink: data.action_link || data.properties?.action_link,
  });
}

export async function createSignupVerificationLink(input: SignUpInput) {
  const url = new URL("/auth/v1/admin/generate_link", appConfig.supabase.url);

  const response = await fetch(url, {
    method: "POST",
    headers: adminAuthHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      type: "signup",
      email: input.email,
      password: input.password,
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        full_name: `${input.firstName} ${input.lastName}`.trim(),
        avatar_data_url: input.avatarUrl || null,
      },
      redirect_to: input.redirectTo,
      options: {
        redirect_to: input.redirectTo,
        email_redirect_to: input.redirectTo,
      },
    }),
  });

  const data = await response.json() as SupabaseGeneratedLink & { msg?: string; message?: string };

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Signup failed.");
  }

//   throw new Error(
//   "SUPABASE RESPONSE:\n" +
//   JSON.stringify(data, null, 2)
// );

  return {
    user: data.user || null,
    verifyUrl: generatedLinkUrl(data, input.redirectTo, "signup"),
  };
}

export async function loginWithEmail(input: LoginInput) {
  const url = new URL("/auth/v1/token", appConfig.supabase.url);
  url.searchParams.set("grant_type", "password");

  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Login failed.");
  }

  return data as SupabaseAuthSession;
}

export async function getAuthUser(accessToken: string) {
  requireAuthConfig();

  const response = await fetch(new URL("/auth/v1/user", appConfig.supabase.url), {
    headers: {
      apikey: appConfig.supabase.anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Could not load authenticated user.");
  }

  return data as SupabaseAuthSession["user"];
}

export async function resendSignupVerification(input: ResendVerificationInput) {
  const response = await fetch(new URL("/auth/v1/admin/generate_link", appConfig.supabase.url), {
    method: "POST",
    headers: adminAuthHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      type: "magiclink",
      email: input.email,
      redirect_to: input.redirectTo,
      options: {
        redirect_to: input.redirectTo,
        email_redirect_to: input.redirectTo,
      },
    }),
  });

  const data = await response.json() as SupabaseGeneratedLink & { msg?: string; message?: string };

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Verification email could not be resent.");
  }

  return {
    user: data.user || null,
    verifyUrl: generatedLinkUrl(data, input.redirectTo, "magiclink"),
  };
}

export async function createPasswordRecoveryLink(input: PasswordRecoveryInput) {
  const response = await fetch(new URL("/auth/v1/admin/generate_link", appConfig.supabase.url), {
    method: "POST",
    headers: adminAuthHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      type: "recovery",
      email: input.email,
      redirect_to: input.redirectTo,
      options: {
        redirect_to: input.redirectTo,
        email_redirect_to: input.redirectTo,
      },
    }),
  });

  const data = await response.json() as SupabaseGeneratedLink & { msg?: string; message?: string };

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Password reset link could not be created.");
  }

  return {
    user: data.user || null,
    resetUrl: generatedLinkUrl(data, input.redirectTo, "recovery"),
  };
}

export function googleOAuthUrl(redirectTo: string) {
  requireAuthConfig();

  const url = new URL("/auth/v1/authorize", appConfig.supabase.url);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", redirectTo);

  return url.toString();
}

export async function updateAuthProfile(input: UpdateProfileInput) {
  requireAuthConfig();

  const url = new URL("/auth/v1/user", appConfig.supabase.url);
  url.searchParams.set("redirect_to", input.redirectTo);

  const body: Record<string, unknown> = {
    data: {
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      full_name: `${input.firstName} ${input.lastName}`.trim(),
      ...(input.avatarUrl ? { avatar_data_url: input.avatarUrl } : {}),
    },
  };

  if (input.email) {
    body.email = input.email;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      apikey: appConfig.supabase.anonKey,
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Profile update failed.");
  }

  return data;
}

export async function updateAuthPassword(accessToken: string, password: string) {
  requireAuthConfig();

  const response = await fetch(new URL("/auth/v1/user", appConfig.supabase.url), {
    method: "PUT",
    headers: {
      apikey: appConfig.supabase.anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Password could not be updated.");
  }

  return data;
}

export async function verifyAuthEmail(tokenHash: string, type: string) {
  const response = await fetch(new URL("/auth/v1/verify", appConfig.supabase.url), {
    method: "POST",
    headers: authHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      token_hash: tokenHash,
      type,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Email verification failed.");
  }

  return data as Partial<SupabaseAuthSession>;
}
