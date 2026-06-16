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
};

type GoogleMapsNamespace = {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    Marker: new (options: Record<string, unknown>) => GoogleMarker;
    InfoWindow: new (options: Record<string, unknown>) => GoogleInfoWindow;
  };
};

type GoogleMapInstance = {
  setCenter: (center: LatLngLiteral) => void;
};

type GoogleMarker = {
  addListener: (eventName: string, callback: () => void) => void;
};

type GoogleInfoWindow = {
  open: (map: GoogleMapInstance, marker: GoogleMarker) => void;
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

export function GoogleMap({
  stations,
  center = appConfig.google.pakistanCenter,
  zoom = appConfig.google.defaultZoom,
  selectedStationId,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(appConfig.google.mapsApiKey ? null : COPY.unavailableMap);

  useEffect(() => {
    if (!mapRef.current || !appConfig.google.mapsApiKey) {
      return;
    }

    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current || !window.google?.maps) {
          return;
        }

        const selected = stations.find((station) => station.id === selectedStationId);
        const selectedCoordinates = selected ? stationCoordinates(selected) : null;
        const map = new window.google.maps.Map(mapRef.current, {
          center: selectedCoordinates || center,
          zoom: selectedCoordinates ? appConfig.google.stationZoom : zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

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
  }, [center, selectedStationId, stations, zoom]);

  if (error) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-md border border-border bg-secondary p-6 text-center text-sm text-muted">
        {error}
      </div>
    );
  }

  return <div ref={mapRef} className="min-h-96 w-full rounded-md border border-border" />;
}
