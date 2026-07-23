import { googleService } from "@/src/services/google.service";

export const dynamic = "force-dynamic";

const commonLocations = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Hyderabad",
  "Gujranwala",
];

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";

  if (query.length < 2) {
    return Response.json({ suggestions: [] });
  }

  const normalizedQuery = query.toLowerCase();
  const fallbackSuggestions = commonLocations
    .filter((location) => location.toLowerCase().includes(normalizedQuery))
    .map((location) => ({
      id: `city-${location.toLowerCase()}`,
      label: location,
      detail: "Pakistan",
      value: location,
      placeId: null,
    }));

  try {
    const googleSuggestions = await googleService.searchLocationSuggestions(query);
    const suggestions = [...fallbackSuggestions, ...googleSuggestions]
      .filter((suggestion, index, allSuggestions) => (
        allSuggestions.findIndex((candidate) => candidate.value.toLowerCase() === suggestion.value.toLowerCase()) === index
      ))
      .slice(0, 8);

    return Response.json({ suggestions });
  } catch {
    return Response.json({ suggestions: fallbackSuggestions });
  }
}
