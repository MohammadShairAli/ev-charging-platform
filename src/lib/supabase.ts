import { appConfig, hasSupabaseConfig } from "@/src/lib/config";

type QueryValue = string | number | boolean | null | undefined;

export class SupabaseRestClient {
  private readonly baseUrl = appConfig.supabase.url;
  private readonly key =
    appConfig.supabase.serviceRoleKey || appConfig.supabase.anonKey;

  get isConfigured() {
    return hasSupabaseConfig;
  }

  async get<T>(table: string, params: Record<string, QueryValue> = {}) {
    if (!this.isConfigured) {
      throw new Error("Supabase configuration is missing.");
    }

    const url = new URL(`/rest/v1/${table}`, this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Supabase request failed with ${response.status}.`);
    }

    return (await response.json()) as T;
  }

  async upsert<T>(table: string, rows: T[], conflictTarget: string) {
    if (!this.isConfigured) {
      throw new Error("Supabase configuration is missing.");
    }

    const url = new URL(`/rest/v1/${table}`, this.baseUrl);
    url.searchParams.set("on_conflict", conflictTarget);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(rows),
    });

    if (!response.ok) {
      throw new Error(`Supabase upsert failed with ${response.status}.`);
    }

    return (await response.json()) as T[];
  }
}

export const supabase = new SupabaseRestClient();
