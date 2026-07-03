"use client";

import { useEffect, useRef, useState } from "react";
import { appConfig } from "@/src/lib/config";
import { COPY, ROUTES } from "@/src/lib/constants";
import type { LatLngLiteral, Station } from "@/src/types";
import { stationCoordinates } from "@/src/utils/station";

type GoogleMapProps = {
  stations: Station[];
  center?: LatLngLiteral;
  zoom?: number;
  selectedStationId?: string;
  className?: string;
  routePolyline?: string | null;
  routePath?: LatLngLiteral[] | null;
  routeOrigin?: LatLngLiteral | null;
  routeDestination?: LatLngLiteral | null;
  onRouteResolved?: (route: { distanceText: string; durationText: string }) => void;
};

type GoogleDirectionsResult = {
  routes?: Array<{
    overview_path?: Array<{ lat: () => number; lng: () => number }>;
    legs?: Array<{
      distance?: { text?: string };
      duration?: { text?: string };
    }>;
  }>;
};

type GoogleDirectionsService = {
  route: (request: {
    origin: LatLngLiteral;
    destination: LatLngLiteral;
    travelMode: string;
  }) => Promise<GoogleDirectionsResult>;
};

type GoogleMapsNamespace = {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    Marker: new (options: Record<string, unknown>) => GoogleMarker;
    InfoWindow: new (options: Record<string, unknown>) => GoogleInfoWindow;
    Polyline: new (options: Record<string, unknown>) => unknown;
    LatLngBounds: new () => GoogleLatLngBounds;
    DirectionsService: new () => GoogleDirectionsService;
    TravelMode: { DRIVING: string };
  };
};

type GoogleMapInstance = {
  setCenter: (center: LatLngLiteral) => void;
  fitBounds: (bounds: GoogleLatLngBounds) => void;
};

type GoogleMarker = {
  addListener: (eventName: string, callback: () => void) => void;
};

type GoogleInfoWindow = {
  open: (map: GoogleMapInstance, marker: GoogleMarker) => void;
};

type GoogleLatLngBounds = {
  extend: (point: LatLngLiteral) => void;
};

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
    initEvMap?: () => void;
  }
}

let loadingPromise: Promise<void> | null = null;

function loadGoogleMaps() {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve, reject) => {
    window.initEvMap = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${appConfig.google.mapsApiKey}&callback=initEvMap`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps script failed to load."));
    document.head.appendChild(script);
  });

  return loadingPromise;
}

function decodePolyline(encoded: string) {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const path: LatLngLiteral[] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    path.push({ lat: lat / 100000, lng: lng / 100000 });
  }

  return path;
}

function originMarkerIcon() {
  return {
    path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z",
    fillColor: "#166534",
    fillOpacity: 1,
    strokeColor: "#FFFFFF",
    strokeWeight: 2,
    scale: 1.1,
  };
}

export function GoogleMap({
  stations,
  center = appConfig.google.pakistanCenter,
  zoom = appConfig.google.defaultZoom,
  selectedStationId,
  className = "",
  routePolyline,
  routePath: suppliedRoutePath,
  routeOrigin,
  routeDestination,
  onRouteResolved,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(appConfig.google.mapsApiKey ? null : COPY.unavailableMap);

  useEffect(() => {
    if (!mapRef.current || !appConfig.google.mapsApiKey) {
      return;
    }

    let cancelled = false;

    loadGoogleMaps()
      .then(async () => {
        if (cancelled || !mapRef.current || !window.google?.maps) {
          return;
        }

        const selected = stations.find((station) => station.id === selectedStationId);
        const selectedCoordinates = selected ? stationCoordinates(selected) : null;
        let routePath = suppliedRoutePath?.length
          ? suppliedRoutePath
          : routePolyline
            ? decodePolyline(routePolyline)
            : [];
        const map = new window.google.maps.Map(mapRef.current, {
          center: selectedCoordinates || center,
          zoom: selectedCoordinates ? appConfig.google.stationZoom : zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        if (routeOrigin && window.google?.maps) {
          new window.google.maps.Marker({
            position: routeOrigin,
            map,
            title: "Your location",
            icon: originMarkerIcon(),
          });
        }

        if (!routePath.length && routeOrigin && routeDestination) {
          try {
            const response = await new window.google.maps.DirectionsService().route({
              origin: routeOrigin,
              destination: routeDestination,
              travelMode: window.google.maps.TravelMode.DRIVING,
            });
            const route = response.routes?.[0];
            const leg = route?.legs?.[0];

            routePath = (route?.overview_path || []).map((point) => ({
              lat: point.lat(),
              lng: point.lng(),
            }));

            if (routePath.length) {
              onRouteResolved?.({
                distanceText: leg?.distance?.text || "Distance unavailable",
                durationText: leg?.duration?.text || "ETA unavailable",
              });
            }
          } catch {
            routePath = [];
          }
        }

        if (cancelled) {
          return;
        }

        if (routePath.length) {
          new window.google.maps.Polyline({
            path: routePath,
            geodesic: true,
            strokeColor: "#166534",
            strokeOpacity: 0.95,
            strokeWeight: 5,
            map,
          });

          const bounds = new window.google.maps.LatLngBounds();
          routePath.forEach((point) => bounds.extend(point));
          map.fitBounds(bounds);
        }

        stations.forEach((station) => {
          const coordinates = stationCoordinates(station);

          if (!coordinates || !window.google?.maps) {
            return;
          }

          const marker = new window.google.maps.Marker({
            position: coordinates,
            map,
            title: station.name,
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: `<strong>${station.name}</strong><br/><a href="${ROUTES.stations}/${station.id}">View Details</a>`,
          });

          marker.addListener("click", () => {
            infoWindow.open(map, marker);
            map.setCenter(coordinates);
          });
        });
      })
      .catch(() => setError(COPY.unavailableMap));

    return () => {
      cancelled = true;
    };
  }, [center, onRouteResolved, routeDestination, routeOrigin, routePolyline, selectedStationId, stations, suppliedRoutePath, zoom]);

  if (error) {
    return <MapFallback message={error} className={className} />;
  }

  return (
    <div className={`ev-map-placeholder relative min-h-[17rem] w-full overflow-hidden rounded-lg border border-border sm:min-h-96 ${className}`}>
      <div ref={mapRef} className="absolute inset-0" />
    </div>
  );
}

function MapFallback({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <div className={`ev-map-placeholder relative min-h-[17rem] overflow-hidden rounded-lg border border-border p-4 text-foreground sm:min-h-96 ${className}`}>
      <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-border bg-secondary p-4">
        <p className="text-sm font-semibold text-foreground">Map loading</p>
        <p className="mt-1 text-sm leading-6 text-muted">{message}</p>
      </div>
    </div>
  );
}
