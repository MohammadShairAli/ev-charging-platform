import { supabase } from "@/src/lib/supabase";
import { googleService } from "@/src/services/google.service";
import type { Station, StationFilters } from "@/src/types";
import { calculateDistanceKm } from "@/src/utils/distance";
import { isLikelyChargingStation, isStationInPakistan } from "@/src/utils/station-quality";

function normalizeStation(row: Station): Station {
  return {
    ...row,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    rating: row.rating === null ? null : Number(row.rating),
  };
}

function applyFilters(stations: Station[], filters: StationFilters = {}) {
  const query = filters.q?.trim().toLowerCase();

  let results = stations.filter(isLikelyChargingStation).filter(isStationInPakistan).map((station) => {
    if (!filters.origin || station.latitude === null || station.longitude === null) {
      return station;
    }

    return {
      ...station,
      distanceKm: calculateDistanceKm(filters.origin, {
        lat: station.latitude,
        lng: station.longitude,
      }),
    };
  });

  if (query) {
    results = results.filter((station) =>
      [station.name, station.address, station.operator]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }

  const sort = filters.sort || (filters.origin ? "distance" : "name");

  return results.sort((a, b) => {
    if (sort === "rating") {
      return (b.rating || 0) - (a.rating || 0);
    }

    if (sort === "distance") {
      const distanceDelta = (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY);
      return Number.isFinite(distanceDelta) ? distanceDelta : a.name.localeCompare(b.name);
    }

    return a.name.localeCompare(b.name);
  });
}

function mergeStations(primary: Station[], secondary: Station[]) {
  const seen = new Set<string>();
  const merged: Station[] = [];

  for (const station of [...primary, ...secondary]) {
    const key = station.google_place_id || station.id;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(station);
  }

  return merged;
}

export class StationsService {
  async list(filters: StationFilters = {}) {
    const params: Record<string, string> = {
      select: "*",
      order: "name.asc",
    };

    if (filters.q?.trim()) {
      const query = filters.q?.trim().replaceAll(",", " ");
      params.or = `(name.ilike.*${query}*,address.ilike.*${query}*,operator.ilike.*${query}*)`;
    }

    if (supabase.isConfigured) {
      try {
        const rows = await supabase.get<Station[]>("stations", params);

        if (rows.length) {
          const databaseStations = rows.map(normalizeStation);

          if (filters.origin) {
            try {
              const nearbyGoogleStations = await googleService.searchNearbyEvStations(filters.origin);
              return applyFilters(mergeStations(databaseStations, nearbyGoogleStations), filters);
            } catch {
              return applyFilters(databaseStations, filters);
            }
          }

          return applyFilters(databaseStations, filters);
        }
      } catch {
        // Google remains a live source when the database API is unavailable.
      }
    }

    const googleStations = filters.origin
      ? await googleService.searchNearbyEvStations(filters.origin)
      : await googleService.searchEvStations(filters.q || "Pakistan");
    return applyFilters(googleStations, filters);
  }

  async findById(id: string) {
    if (supabase.isConfigured) {
      try {
        const rows = await supabase.get<Station[]>("stations", {
          select: "*",
          or: `(id.eq.${id},google_place_id.eq.${id.replace(/^google-/, "")})`,
          limit: 1,
        });

        if (rows[0]) {
          return normalizeStation(rows[0]);
        }
      } catch {
        // Google remains a live source when the database API is unavailable.
      }
    }

    return googleService.findEvStationByPlaceId(id);
  }

  async saveFromGoogle(stations: Station[]) {
    const pakistanStations = stations.filter(isStationInPakistan);

    if (!supabase.isConfigured || !pakistanStations.length) {
      return [];
    }

    return supabase.upsert("stations", pakistanStations, "google_place_id");
  }
}

export const stationsService = new StationsService();
