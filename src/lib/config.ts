import type { LatLngLiteral } from "@/src/types";

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "EV Charging Pakistan",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
  theme: {
    primary: process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#22C55E",
    secondary: process.env.NEXT_PUBLIC_SECONDARY_COLOR || "#FFFFFF",
  },
  google: {
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
    browserMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
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
    authRedirectUrl: process.env.SUPABASE_AUTH_REDIRECT_URL || "",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || "ev-network-pakistan/profiles",
  },
  smtp: {
    host: process.env.SMTP_HOST || process.env.SUPABASE_SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || process.env.SUPABASE_SMTP_PORT || 587),
    user: process.env.SMTP_USER || process.env.SUPABASE_SMTP_USER || "",
    pass: process.env.SMTP_PASS || process.env.SUPABASE_SMTP_PASS || "",
    fromName: process.env.SMTP_FROM_NAME || process.env.SUPABASE_SMTP_SENDER_NAME || "EV Charging Pakistan",
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SUPABASE_SMTP_ADMIN_EMAIL || process.env.SMTP_USER || process.env.SUPABASE_SMTP_USER || "",
  },
} as const;

export const hasSupabaseConfig =
  Boolean(appConfig.supabase.url) &&
  Boolean(appConfig.supabase.anonKey || appConfig.supabase.serviceRoleKey);
