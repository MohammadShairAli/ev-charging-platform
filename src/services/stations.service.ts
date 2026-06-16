import { SAMPLE_STATIONS } from "@/src/lib/constants";
import { supabase } from "@/src/lib/supabase";
import type { Station, StationFilters } from "@/src/types";
import { calculateDistanceKm } from "@/src/utils/distance";

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

  let results = stations.map((station) => {
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
      return (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY);
    }

    return a.name.localeCompare(b.name);
  });
}

export class StationsService {
  async list(filters: StationFilters = {}) {
    // if (!supabase.isConfigured) {
    // }
    return applyFilters(SAMPLE_STATIONS, filters);

    const params: Record<string, string> = {
      select: "*",
      order: "name.asc",
    };

    if (filters.q?.trim()) {
      const query = filters.q.trim().replaceAll(",", " ");
      params.or = `name.ilike.*${query}*,address.ilike.*${query}*,operator.ilike.*${query}*`;
    }

    // const rows = await supabase.get<Station[]>("stations", params);
    // return applyFilters(rows.map(normalizeStation), filters);
    let rows: Station[] = [];

try {
  rows = await supabase.get<Station[]>("stations", params);
} catch (e) {
  console.error("Supabase failed:", e);
  rows = [];
}

return applyFilters(rows.map(normalizeStation), filters);
  }

  async findById(id: string) {
    return SAMPLE_STATIONS.find((station) => station.id === id) || null;
    // if (!supabase.isConfigured) {
    // }

    const rows = await supabase.get<Station[]>("stations", {
      select: "*",
      id: `eq.${id}`,
      limit: 1,
    });

    return rows[0] ? normalizeStation(rows[0]) : null;
  }

  async saveFromGoogle(stations: Station[]) {
    return supabase.upsert("stations", stations, "google_place_id");
  }
}

export const stationsService = new StationsService();
