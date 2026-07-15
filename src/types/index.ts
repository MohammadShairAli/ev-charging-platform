export type LatLngLiteral = {
  lat: number;
  lng: number;
};

export type Station = {
  id: string;
  google_place_id: string | null;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  operator: string | null;
  created_at: string | null;
  updated_at: string | null;
  distanceKm?: number;
};

export type StationAmenitiesData = {
  openNow: boolean | null;
  todayHours: string | null;
  restroom: boolean | null;
  restaurant: boolean | null;
  prayerArea: boolean | null;
  servesCoffee: boolean | null;
  security: boolean | null;
  parking: boolean | null;
  photoCount: number | null;
  photos: Array<{
    attributionName: string | null;
    attributionUri: string | null;
  }>;
};

export type NearbyFoodPlace = {
  name: string;
  address: string | null;
  distanceKm: number;
};

export type NearbyFoodAndCoffee = {
  coffee: NearbyFoodPlace[];
  restaurants: NearbyFoodPlace[];
};

export type StationSort = "name" | "rating" | "distance";

export type StationFilters = {
  q?: string;
  sort?: StationSort;
  origin?: LatLngLiteral;
};

export type DirectionsRequest = {
  origin: LatLngLiteral;
  destination: LatLngLiteral;
};

export type DirectionsResult = {
  distanceText: string;
  durationText: string;
  polyline: string | null;
};

export type ApiError = {
  message: string;
};
