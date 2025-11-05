'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Map, {
  Marker,
  GeolocateControl,
  MapRef,
  Source,
  Layer,
} from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { FeatureCollection, LineString } from 'geojson'
import type { LaneInfo, NavigationStep } from '@/lib/types'

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
  isNavigating?: boolean
  userHeading?: number | null
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
  isNavigating = false,
  userHeading = null,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null)
  
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const mapError = !mapboxToken ? 'Mapbox token not configured' : null

  const initialViewState = useMemo(() => ({
    longitude: center?.[0] || -0.1276,
    latitude: center?.[1] || 51.5074,
    zoom: zoom,
    pitch: 0,
    bearing: 0,
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

  // Update map view during navigation with 3D perspective - Waze-style auto-follow
  useEffect(() => {
    if (center && mapRef.current && !fitBounds) {
      const map = mapRef.current
      
      if (isNavigating) {
        // Waze-style: auto-center, auto-rotate to heading, auto-tilt
        map.easeTo({
          center: [center[0], center[1]],
          zoom: 22,
          pitch: 60,
          bearing: userHeading ?? 0, // Auto-rotate to follow heading
          duration: 300,
          easing: (t) => t, // Linear for smooth GPS tracking
        })
      } else {
        // Normal mode: flat top-down view
        map.flyTo({
          center: [center[0], center[1]],
          pitch: 0,
          bearing: 0,
          duration: 1000
        })
      }
    }
  }, [center, fitBounds, isNavigating, userHeading])

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
        maxZoom={22}
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

        {/* Lane Overlay - Amap style lanes on road */}
        {isNavigating && activeStep?.lanes && center && route && (
          <LaneOverlay
            lanes={activeStep.lanes}
            position={center}
            geometry={route.features[0]?.geometry.coordinates as [number, number][]}
          />
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

interface LaneOverlayProps {
  lanes: LaneInfo[]
  position: [number, number]
  geometry?: [number, number][]
}

type LaneFeatureCollection = FeatureCollection<LineString, {
  index: number
  valid: boolean
  active: boolean
  isDivider?: boolean
}>

const DEG2RAD = Math.PI / 180
  const LANE_WIDTH_METERS = 0.5 // Visual spacing between lane centers for map display

const projectToLocalMeters = (
  coordinate: [number, number],
  reference: [number, number]
): [number, number] => {
  const [lon, lat] = coordinate
  const [refLon, refLat] = reference
  const refLatRad = refLat * DEG2RAD

  const metersPerDegLat = 111132.92 - 559.82 * Math.cos(2 * refLatRad) + 1.175 * Math.cos(4 * refLatRad) - 0.0023 * Math.cos(6 * refLatRad)
  const metersPerDegLon = 111412.84 * Math.cos(refLatRad) - 93.5 * Math.cos(3 * refLatRad) + 0.118 * Math.cos(5 * refLatRad)

  return [
    (lon - refLon) * metersPerDegLon,
    (lat - refLat) * metersPerDegLat,
  ]
}

const unprojectToLonLat = (
  point: [number, number],
  reference: [number, number]
): [number, number] => {
  const [x, y] = point
  const [refLon, refLat] = reference
  const refLatRad = refLat * DEG2RAD

  const metersPerDegLat = 111132.92 - 559.82 * Math.cos(2 * refLatRad) + 1.175 * Math.cos(4 * refLatRad) - 0.0023 * Math.cos(6 * refLatRad)
  const metersPerDegLon = 111412.84 * Math.cos(refLatRad) - 93.5 * Math.cos(3 * refLatRad) + 0.118 * Math.cos(5 * refLatRad)

  return [
    refLon + x / metersPerDegLon,
    refLat + y / metersPerDegLat,
  ]
}

const normalize = (vector: [number, number]): [number, number] => {
  const [x, y] = vector
  const length = Math.hypot(x, y)
  if (length === 0) {
    return [0, 0]
  }
  return [x / length, y / length]
}

function LaneOverlay({ lanes, position, geometry }: LaneOverlayProps) {
  const [pulsePhase, setPulsePhase] = useState(0)
  
  // Animate pulse effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase((prev: number) => (prev + 0.08) % 1)
    }, 16) // 60 FPS animation
    return () => clearInterval(interval)
  }, [])

  const laneFeatures = useMemo<LaneFeatureCollection | null>(() => {
    if (!lanes || lanes.length === 0 || !geometry || geometry.length < 2) {
      return null
    }

    const reference = position

    // Build lane segments that follow the actual road geometry
    const features: LaneFeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    }

    const laneCount = lanes.length
    const laneCenterOffset = (laneCount - 1) / 2

    // Helper function to generate coordinates for a given offset along entire route
    const generatePathCoordinates = (offset: number): [number, number][] => {
      const pathCoordinates: [number, number][] = []
      
      // Sample the entire route geometry
      for (let i = 0; i < geometry.length - 1; i++) {
        const start = projectToLocalMeters(geometry[i], reference)
        const end = projectToLocalMeters(geometry[i + 1], reference)
        const segment = [end[0] - start[0], end[1] - start[1]] as [number, number]
        const segmentLength = Math.hypot(segment[0], segment[1])

        if (segmentLength === 0) continue

        const direction = normalize(segment)
        const normal: [number, number] = [direction[1], -direction[0]]

        // Sample this segment every 10 meters for performance
        const sampleStep = 10
        const samples = Math.max(2, Math.ceil(segmentLength / sampleStep))

        for (let s = 0; s < samples; s++) {
          const t = s / (samples - 1)
          const point: [number, number] = [
            start[0] + segment[0] * t,
            start[1] + segment[1] * t,
          ]

          const offsetPoint: [number, number] = [
            point[0] + normal[0] * offset,
            point[1] + normal[1] * offset,
          ]

          pathCoordinates.push(unprojectToLonLat(offsetPoint, reference))
        }
      }

      return pathCoordinates
    }

    // Generate lane highlights
    lanes.forEach((lane, laneIndex) => {
      const offset = (laneIndex - laneCenterOffset) * LANE_WIDTH_METERS
      const laneCoordinates = generatePathCoordinates(offset)

      if (laneCoordinates.length >= 2) {
        features.features.push({
          type: 'Feature',
          properties: {
            index: laneIndex,
            valid: lane.valid,
            active: lane.valid && lane.active,
            isDivider: false,
          },
          geometry: {
            type: 'LineString',
            coordinates: laneCoordinates,
          },
        })
      }
    })

    // Generate divider lines between lanes
    for (let i = 0; i < laneCount - 1; i++) {
      // Calculate offset position between lane i and lane i+1
      const laneOffset1 = (i - laneCenterOffset) * LANE_WIDTH_METERS
      const laneOffset2 = (i + 1 - laneCenterOffset) * LANE_WIDTH_METERS
      const dividerOffset = (laneOffset1 + laneOffset2) / 2
      
      const dividerCoordinates = generatePathCoordinates(dividerOffset)
      
      if (dividerCoordinates.length >= 2) {
        features.features.push({
          type: 'Feature',
          properties: {
            index: -1,
            valid: false,
            active: false,
            isDivider: true,
          },
          geometry: {
            type: 'LineString',
            coordinates: dividerCoordinates,
          },
        })
      }
    }

    return features.features.length > 0 ? features : null
  }, [lanes, position, geometry])

  if (!laneFeatures || laneFeatures.features.length === 0) {
    return null
  }

  return (
    <Source id="lane-overlay" type="geojson" data={laneFeatures} lineMetrics={true}>
      {/* Road surface base - asphalt */}
      <Layer
        id="lane-overlay-road-surface"
        type="line"
        paint={{
          'line-color': '#2C2C2C',
          'line-width': 80,
          'line-opacity': 0.95,
        }}
        layout={{
          'line-cap': 'butt',
          'line-join': 'round',
        }}
      />
      {/* Lane divider lines - dashed white/yellow between lanes only */}
      <Layer
        id="lane-overlay-dividers"
        type="line"
        paint={{
          'line-color': '#FFFFFF',
          'line-width': 2,
          'line-opacity': ['case', ['boolean', ['get', 'isDivider'], false], 0.7, 0],
          'line-dasharray': [3, 3],
        }}
        layout={{
          'line-cap': 'butt',
          'line-join': 'miter',
        }}
      />
      {/* Active lane - solid bright green */}
      <Layer
        id="lane-overlay-active-base"
        type="line"
        paint={{
          'line-color': '#84CC16',
          'line-width': 28,
          'line-opacity': ['case', ['boolean', ['get', 'active'], false], 0.9, 0],
        }}
        layout={{
          'line-cap': 'round',
          'line-join': 'round',
        }}
      />
      {/* Active lane glow - pulsing effect */}
      <Layer
        id="lane-overlay-active-glow"
        type="line"
        paint={{
          'line-color': '#A3E635',
          'line-width': 32,
          'line-opacity': ['case', ['boolean', ['get', 'active'], false], 0.25 + pulsePhase * 0.15, 0],
          'line-blur': 6,
        }}
        layout={{
          'line-cap': 'round',
          'line-join': 'round',
        }}
      />
      {/* Valid lane highlight - blue glow */}
      <Layer
        id="lane-overlay-valid"
        type="line"
        paint={{
          'line-color': '#38BDF8',
          'line-width': 24, // 30% smaller than 35
          'line-opacity': [
            'case',
            ['boolean', ['get', 'active'], false], 0,
            ['boolean', ['get', 'valid'], false], 0.65,
            0
          ],
          'line-blur': 2,
        }}
        layout={{
          'line-cap': 'round',
          'line-join': 'round',
        }}
      />
    </Source>
  )
}
