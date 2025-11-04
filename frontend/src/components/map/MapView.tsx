/**
 * MapView Component
 * Mapbox GL JS integration for real-time location display
 * TODO: Full implementation in Epic 3
 */

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { MAPBOX_TOKEN, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, MAP_STYLE } from '@/utils/constants';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox access token
mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
}

export default function MapView({ center = DEFAULT_MAP_CENTER, zoom = DEFAULT_MAP_ZOOM }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center,
      zoom,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add user location control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

    // Cleanup on unmount
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [center, zoom]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
}
