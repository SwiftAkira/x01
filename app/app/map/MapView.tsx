'use client'

import { useEffect, useMemo, useRef } from 'react'
import Map, {
  Marker,
  GeolocateControl,
  MapRef,
  Source,
  Layer,
} from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { FeatureCollection, LineString } from 'geojson'
import type { NavigationStep } from '@/lib/types'

export interface MarkerData {
  id: string
  latitude: number
  longitude: number
  displayName?: string
  speed?: number
  heading?: number
  isCurrentUser?: boolean
}

interface MapViewProps {
  markers?: MarkerData[]
  center?: [number, number]
  zoom?: number
  onLocationUpdate?: (latitude: number, longitude: number) => void
  className?: string
  route?: FeatureCollection<LineString>
  destination?: {
    name: string
    coordinates: [number, number]
  } | null
  activeStep?: NavigationStep | null
  fitBounds?: boolean
}

interface GeolocateEvent {
  coords: {
    latitude: number
    longitude: number
    accuracy: number
    altitude: number | null
    altitudeAccuracy: number | null
    heading: number | null
    speed: number | null
  }
}

export default function MapView({
  markers = [],
  center,
  zoom = 13,
  onLocationUpdate,
  className = '',
  route,
  destination,
  activeStep,
  fitBounds = false,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null)
  
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const mapError = !mapboxToken ? 'Mapbox token not configured' : null

  const initialViewState = useMemo(() => ({
    longitude: center?.[0] || -0.1276,
    latitude: center?.[1] || 51.5074,
    zoom: zoom,
  }), [center, zoom])

  // Fit bounds to route when needed
  useEffect(() => {
    if (fitBounds && route && mapRef.current) {
      const coordinates = route.features[0]?.geometry.coordinates as [number, number][]
      if (coordinates && coordinates.length > 0) {
        // Calculate bounds
        let minLng = coordinates[0][0]
        let maxLng = coordinates[0][0]
        let minLat = coordinates[0][1]
        let maxLat = coordinates[0][1]

        coordinates.forEach(([lng, lat]) => {
          minLng = Math.min(minLng, lng)
          maxLng = Math.max(maxLng, lng)
          minLat = Math.min(minLat, lat)
          maxLat = Math.max(maxLat, lat)
        })

        mapRef.current.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          {
            padding: 60,
            duration: 1000,
          }
        )
      }
    }
  }, [fitBounds, route])

  useEffect(() => {
    if (center && mapRef.current && !fitBounds) {
      mapRef.current.flyTo({
        center: [center[0], center[1]],
        duration: 1000
      })
    }
  }, [center, fitBounds])

  const handleGeolocate = (e: GeolocateEvent) => {
    if (e.coords && onLocationUpdate) {
      onLocationUpdate(e.coords.latitude, e.coords.longitude)
    }
  }

  if (mapError) {
    return (
      <div className={`flex items-center justify-center bg-[#171717] rounded-xl border border-[#262626] ${className}`}>
        <div className="text-center p-8">
          <p className="text-[#DC2626] font-bold mb-2">Map Error</p>
          <p className="text-[#A3A3A3] text-sm">{mapError}</p>
        </div>
      </div>
    )
  }

  if (!mapboxToken) {
    return (
      <div className={`flex items-center justify-center bg-[#171717] rounded-xl border border-[#262626] ${className}`}>
        <div className="text-center p-8">
          <p className="text-[#FBBF24] font-bold mb-2">Map Loading...</p>
          <p className="text-[#A3A3A3] text-sm">Initializing map service</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-[#262626] ${className}`}>
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        cursor="grab"
      >
        {/* Geolocate Control */}
        <GeolocateControl
          position="top-right"
          trackUserLocation
          showUserHeading
          onGeolocate={handleGeolocate}
          style={{
            backgroundColor: '#171717',
            borderColor: '#262626',
          }}
        />

        {/* Active Route */}
        {route && (
          <Source id="navigation-route" type="geojson" data={route}>
            <Layer
              id="navigation-route-line"
              type="line"
              paint={{
                'line-color': '#38BDF8',
                'line-width': 5,
                'line-opacity': 0.8,
                'line-blur': 0.2,
              }}
            />
          </Source>
        )}

        {/* Party Member Markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            longitude={marker.longitude}
            latitude={marker.latitude}
            anchor="bottom"
          >
            <div className="relative">
              {/* Speed indicator above marker */}
              {marker.speed !== undefined && marker.speed > 0 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0C0C0C] border border-[#84CC16] rounded px-2 py-1 text-xs font-bold text-[#84CC16] whitespace-nowrap">
                  {Math.round(marker.speed)} km/h
                </div>
              )}
              
              {/* Marker pin */}
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-lg ${
                  marker.isCurrentUser
                    ? 'bg-[#84CC16] border-[#65A30D]'
                    : 'bg-[#FBBF24] border-[#D97706]'
                }`}
                style={
                  marker.heading !== undefined
                    ? { transform: `rotate(${marker.heading}deg)` }
                    : undefined
                }
              >
                {marker.isCurrentUser ? (
                  <div className="w-3 h-3 bg-[#0C0C0C] rounded-full" />
                ) : (
                  <div className="w-3 h-3 bg-[#171717] rounded-full" />
                )}
              </div>

              {/* Display name below marker */}
              {marker.displayName && (
                <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-[#0C0C0C]/90 border border-[#262626] rounded px-2 py-1 text-xs font-semibold text-[#FAFAFA] whitespace-nowrap">
                  {marker.displayName}
                </div>
              )}
            </div>
          </Marker>
        ))}

        {/* Destination Marker */}
        {destination && (
          <Marker
            longitude={destination.coordinates[0]}
            latitude={destination.coordinates[1]}
            anchor="bottom"
          >
            <div className="flex flex-col items-center">
              <span className="mb-1 rounded bg-[#0C0C0C]/90 px-2 py-1 text-xs font-semibold text-[#FAFAFA]">
                {destination.name}
              </span>
              <div className="h-9 w-9 rounded-full border-2 border-[#38BDF8] bg-[#0C0C0C] flex items-center justify-center shadow-lg">
                <div className="h-2 w-2 rounded-full bg-[#38BDF8]" />
              </div>
            </div>
          </Marker>
        )}

        {/* Upcoming Maneuver */}
        {activeStep && (
          <Marker
            longitude={activeStep.maneuverLocation[0]}
            latitude={activeStep.maneuverLocation[1]}
            anchor="bottom"
          >
            <div className="flex flex-col items-center">
              <span className="mb-1 rounded bg-[#0C0C0C]/90 px-2 py-1 text-xs font-semibold text-[#38BDF8]">
                Next turn
              </span>
              <div className="h-6 w-6 rounded-full border-2 border-[#38BDF8] bg-[#1F2937] flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
              </div>
            </div>
          </Marker>
        )}
      </Map>

      {/* Speed legend - bottom left */}
      {markers.some(m => m.speed !== undefined) && (
        <div className="absolute bottom-4 left-4 bg-[#0C0C0C]/90 border border-[#262626] rounded-lg p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-[#84CC16] rounded-full" />
            <span className="text-[#FAFAFA] font-semibold">You</span>
          </div>
          <div className="flex items-center gap-2 text-xs mt-2">
            <div className="w-3 h-3 bg-[#FBBF24] rounded-full" />
            <span className="text-[#FAFAFA] font-semibold">Party</span>
          </div>
        </div>
      )}
    </div>
  )
}
