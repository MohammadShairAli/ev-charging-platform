import { appConfig } from "@/src/lib/config";

type GooglePlacePhoto = {
  name?: string;
};

type GooglePlaceDetailsResponse = {
  photos?: GooglePlacePhoto[];
};

const fallbackImagePath = "/ev-hero.png";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const placeId = url.searchParams.get("placeId");
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
    const photoName = details.photos?.[0]?.name;

    if (!photoName) {
      return Response.redirect(new URL(fallbackImagePath, request.url));
    }

    const photoUrl = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
    photoUrl.searchParams.set("maxHeightPx", "160");
    photoUrl.searchParams.set("maxWidthPx", "160");
    photoUrl.searchParams.set("key", apiKey);

    return Response.redirect(photoUrl);
  } catch {
    return Response.redirect(new URL(fallbackImagePath, request.url));
  }
}
