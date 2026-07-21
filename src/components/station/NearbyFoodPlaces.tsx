import type { NearbyFoodAndCoffee, NearbyFoodPlace } from "@/src/types";
import { AppIcon } from "@/src/components/ui/AppIcon";

type NearbyFoodPlacesProps = {
  places: NearbyFoodAndCoffee;
};

export function NearbyFoodPlaces({ places }: NearbyFoodPlacesProps) {
  if (places.coffee.length === 0 && places.restaurants.length === 0) {
    return null;
  }

  const combinedPlaces = [
    ...places.coffee.map((place) => ({ ...place, category: "Coffee", icon: "local_cafe" })),
    ...places.restaurants.map((place) => ({ ...place, category: "Restaurant", icon: "restaurant" })),
  ].sort((a, b) => a.distanceKm - b.distanceKm);
  const isScrollable = combinedPlaces.length > 3;

  return (
    <section className="mt-6 border-t border-border pt-6" aria-labelledby="nearby-food-heading">
      <div>
        <h2 id="nearby-food-heading" className="text-lg font-bold text-foreground">Food &amp; coffee nearby</h2>
        <p className="mt-1 text-sm text-muted">Places found within 1 km of this station.</p>
      </div>

      <ul
        className={`mt-4 space-y-2 ${isScrollable ? "max-h-[20.5rem] overflow-y-auto overscroll-contain pr-2" : ""}`}
        tabIndex={isScrollable ? 0 : undefined}
        aria-label={isScrollable ? "Scrollable list of nearby food and coffee" : undefined}
      >
        {combinedPlaces.map((place) => (
          <NearbyPlaceCard key={`${place.category}-${place.name}-${place.distanceKm}`} place={place} />
        ))}
      </ul>
    </section>
  );
}

function NearbyPlaceCard({
  place,
}: {
  place: NearbyFoodPlace & { category: string; icon: string };
}) {
  const directionsUrl = nearbyPlaceDirectionsUrl(place);

  return (
    <li className="h-[6.5rem] rounded-xl border border-border bg-background p-3">
      <div className="flex h-full items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-semibold leading-5 text-foreground">{place.name}</p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
            <AppIcon name={place.icon} className="h-4 w-4" />
            <span>{place.category}</span>
          </div>
          {place.address ? <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted">{place.address}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="rounded-full bg-accent-soft px-2 py-1 text-[11px] font-bold text-primary">
            {formatDistance(place.distanceKm)}
          </span>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open directions to ${place.name} in Google Maps`}
            className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-surface text-foreground transition hover:border-primary hover:text-primary"
          >
            <AppIcon name="near_me" className="h-5 w-5" />
          </a>
        </div>
      </div>
    </li>
  );
}

function nearbyPlaceDirectionsUrl(place: NearbyFoodPlace) {
  const destination = [place.name, place.address].filter(Boolean).join(", ");
  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: "driving",
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function formatDistance(distanceKm: number) {
  const meters = Math.max(1, Math.round(distanceKm * 1000));
  return `${meters} m`;
}
