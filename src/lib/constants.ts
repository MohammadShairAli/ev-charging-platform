import type { Station } from "@/src/types";

export const ROUTES = {
  home: "/",
  stations: "/charging-stations",
} as const;

export const COPY = {
  unavailableMap: "Add a Google Maps API key to view the interactive map.",
  noStations: "No charging stations found. Try another location.",
  directionsUnavailable: "Directions are unavailable for this station.",
  apiUnavailable: "Station data is temporarily unavailable.",
} as const;

export const SAMPLE_STATIONS: Station[] = [
  {
    id: "lahore-liberty-ev",
    google_place_id: "sample-lahore-liberty",
    name: "Liberty EV Charging Station",
    address: "Liberty Market, Gulberg III, Lahore",
    latitude: 31.5102,
    longitude: 74.3441,
    phone: "+92 300 0000000",
    website: "https://maps.google.com",
    rating: 4.3,
    operator: "Sample Operator",
    created_at: null,
    updated_at: null,
  },
  {
    id: "islamabad-blue-area-ev",
    google_place_id: "sample-islamabad-blue-area",
    name: "Blue Area EV Charging Hub",
    address: "Blue Area, Islamabad",
    latitude: 33.7136,
    longitude: 73.0639,
    phone: null,
    website: "https://maps.google.com",
    rating: 4.1,
    operator: "Sample Network",
    created_at: null,
    updated_at: null,
  },
  {
    id: "karachi-clifton-ev",
    google_place_id: "sample-karachi-clifton",
    name: "Clifton EV Charger",
    address: "Block 5 Clifton, Karachi",
    latitude: 24.8138,
    longitude: 67.0305,
    phone: null,
    website: "https://maps.google.com",
    rating: 4.0,
    operator: "Sample Operator",
    created_at: null,
    updated_at: null,
  },
];
