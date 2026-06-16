"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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

type MapFallbackPin = {
  id: string;
  name: string;
  left: number;
  top: number;
  selected: boolean;
};

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
    initEvMap?: () => void;
  }
}

let loadingPromise: Promise<void> | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function stationToFallbackPin(station: Station, selectedStationId?: string): MapFallbackPin | null {
  const coordinates = stationCoordinates(station);

  if (!coordinates) {
    return null;
  }

  return {
    id: station.id,
    name: station.name,
    left: clamp(((coordinates.lng - 60) / 18) * 100, 7, 93),
    top: clamp((1 - (coordinates.lat - 23) / 14) * 100, 8, 92),
    selected: station.id === selectedStationId,
  };
}

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
  const fallbackPins = useMemo(
    () => stations.map((station) => stationToFallbackPin(station, selectedStationId)).filter(Boolean) as MapFallbackPin[],
    [selectedStationId, stations],
  );

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
    return <MapFallback message={error} pins={fallbackPins} />;
  }

  return (
    <div
      ref={mapRef}
      className="map-grid min-h-[22rem] w-full overflow-hidden rounded-lg border border-border shadow-[0_22px_55px_rgba(7,21,18,0.12)] sm:min-h-96"
    />
  );
}

function MapFallback({ message, pins }: { message: string; pins: MapFallbackPin[] }) {
  return (
    <div className="map-grid relative min-h-[22rem] overflow-hidden rounded-lg border border-white/15 p-4 text-secondary shadow-[0_22px_55px_rgba(7,21,18,0.22)] sm:min-h-96">
      <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase text-secondary/80 backdrop-blur">
        Pakistan grid
      </div>
      {pins.map((pin) => {
        const style = {
          left: `${pin.left}%`,
          top: `${pin.top}%`,
        } satisfies CSSProperties;

        return (
          <span
            key={pin.id}
            title={pin.name}
            style={style}
            className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              pin.selected ? "bg-secondary" : "bg-accent"
            } shadow-[0_0_0_7px_rgba(0,194,168,0.16),0_0_28px_rgba(0,194,168,0.8)]`}
          />
        );
      })}
      <div className="absolute inset-x-4 bottom-4 rounded-lg border border-white/15 bg-ink/70 p-4 backdrop-blur-md">
        <p className="text-sm font-semibold text-secondary">Map preview</p>
        <p className="mt-1 text-sm leading-6 text-secondary/75">{message}</p>
        <p className="mt-3 text-xs font-medium uppercase text-accent">
          {pins.length} station{pins.length === 1 ? "" : "s"} indexed
        </p>
      </div>
    </div>
  );
}
