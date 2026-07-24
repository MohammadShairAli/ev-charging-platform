import { appConfig } from "@/src/lib/config";

type GooglePlacePhoto = {
  name?: string;
};

type GooglePlaceDetailsResponse = {
  photos?: GooglePlacePhoto[];
};

const fallbackImagePath = "/icon.png";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const placeId = url.searchParams.get("placeId");
  const requestedIndex = Number(url.searchParams.get("index") || "0");
  const photoIndex = Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < 10
    ? requestedIndex
    : 0;
  const apiKey = appConfig.google.mapsApiKey;

  if (!placeId || !apiKey) {
    return Response.redirect(new URL(fallbackImagePath, request.url));
  }

  try {
    const detailsResponse = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "photos",
      },
      cache: "no-store",
    });

    if (!detailsResponse.ok) {
      return Response.redirect(new URL(fallbackImagePath, request.url));
    }

    const details = (await detailsResponse.json()) as GooglePlaceDetailsResponse;
    const photoName = details.photos?.[photoIndex]?.name;

    if (!photoName) {
      return Response.redirect(new URL(fallbackImagePath, request.url));
    }

    const photoUrl = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
    photoUrl.searchParams.set("maxHeightPx", "720");
    photoUrl.searchParams.set("maxWidthPx", "960");
    photoUrl.searchParams.set("key", apiKey);

    const photoResponse = await fetch(photoUrl, { cache: "no-store", redirect: "follow" });

    if (!photoResponse.ok || !photoResponse.body) {
      return Response.redirect(new URL(fallbackImagePath, request.url));
    }

    return new Response(photoResponse.body, {
      headers: {
        "Content-Type": photoResponse.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.redirect(new URL(fallbackImagePath, request.url));
  }
}
