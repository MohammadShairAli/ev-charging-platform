import type { LatLngLiteral } from "@/src/types";

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "EV Charging Pakistan",
  theme: {
    primary: process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#114B5F",
    secondary: process.env.NEXT_PUBLIC_SECONDARY_COLOR || "#FFFFFF",
  },
  google: {
    mapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    placesApiUrl: "https://maps.googleapis.com/maps/api/place",
    directionsApiUrl: "https://maps.googleapis.com/maps/api/directions/json",
    pakistanCenter: {
      lat: 30.3753,
      lng: 69.3451,
    } satisfies LatLngLiteral,
    defaultZoom: 5,
    stationZoom: 14,
  },
  supabase: {
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },
} as const;

export const hasSupabaseConfig =
  Boolean(appConfig.supabase.url) &&
  Boolean(appConfig.supabase.anonKey || appConfig.supabase.serviceRoleKey);
