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

  // Update map view during navigation with 3D perspective
  useEffect(() => {
    if (center && mapRef.current && !fitBounds) {
      if (isNavigating) {
        // Navigation mode: 3D tilted view following heading with lane-level zoom
        mapRef.current.flyTo({
          center: [center[0], center[1]],
          zoom: 22, // Ultra-close zoom to deliver native-feeling lane guidance
          pitch: 60, // Tilt the map to 3D perspective
          bearing: userHeading ?? 0, // Rotate map to face direction of travel
          duration: 500,
        })
      } else {
        // Normal mode: flat top-down view
        mapRef.current.flyTo({
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
        {isNavigating && activeStep?.lanes && center && userHeading !== null && (
          <LaneOverlay
            lanes={activeStep.lanes}
            position={center}
            heading={userHeading}
            geometry={activeStep.geometry}
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
  heading: number
  geometry?: [number, number][]
}

type LaneFeatureCollection = FeatureCollection<LineString, {
  index: number
  valid: boolean
  active: boolean
}>

const DEG2RAD = Math.PI / 180
const LANE_WIDTH_METERS = 3.5
const BACKWARD_LENGTH_METERS = 15
const FORWARD_LENGTH_METERS = 45

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

const getFallbackDirection = (heading: number): [number, number] => {
  const headingRad = (heading % 360) * DEG2RAD
  const x = Math.sin(headingRad)
  const y = Math.cos(headingRad)
  return normalize([x, y])
}

function LaneOverlay({ lanes, position, heading, geometry }: LaneOverlayProps) {
  const laneFeatures = useMemo<LaneFeatureCollection | null>(() => {
    if (!lanes || lanes.length === 0) {
      return null
    }

    const reference = position
    const anchorMeters = projectToLocalMeters(position, reference)

    let bestPoint = anchorMeters
    let direction: [number, number] | null = null

    if (geometry && geometry.length >= 2) {
      let minDistance = Number.POSITIVE_INFINITY

      for (let i = 0; i < geometry.length - 1; i++) {
        const start = projectToLocalMeters(geometry[i], reference)
        const end = projectToLocalMeters(geometry[i + 1], reference)
        const segment = [end[0] - start[0], end[1] - start[1]] as [number, number]
        const segmentLengthSquared = segment[0] * segment[0] + segment[1] * segment[1]

        if (segmentLengthSquared === 0) {
          continue
        }

        const toAnchor = [anchorMeters[0] - start[0], anchorMeters[1] - start[1]] as [number, number]
        let t = (toAnchor[0] * segment[0] + toAnchor[1] * segment[1]) / segmentLengthSquared
        t = Math.max(0, Math.min(1, t))

        const projection: [number, number] = [
          start[0] + segment[0] * t,
          start[1] + segment[1] * t,
        ]

        const distanceToSegment = Math.hypot(
          projection[0] - anchorMeters[0],
          projection[1] - anchorMeters[1]
        )

        if (distanceToSegment < minDistance) {
          minDistance = distanceToSegment
          bestPoint = projection
          direction = normalize(segment)
        }
      }
    }

    if (!direction || (direction[0] === 0 && direction[1] === 0)) {
      direction = getFallbackDirection(heading)
    }

    const normal: [number, number] = [-direction[1], direction[0]]
    const features: LaneFeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    }

    const laneCount = lanes.length
    const laneCenterOffset = (laneCount - 1) / 2

    lanes.forEach((lane, index) => {
      const offset = (index - laneCenterOffset) * LANE_WIDTH_METERS
      const offsetVector: [number, number] = [
        normal[0] * offset,
        normal[1] * offset,
      ]

      const startPoint: [number, number] = [
        bestPoint[0] - direction[0] * BACKWARD_LENGTH_METERS + offsetVector[0],
        bestPoint[1] - direction[1] * BACKWARD_LENGTH_METERS + offsetVector[1],
      ]

      const endPoint: [number, number] = [
        bestPoint[0] + direction[0] * FORWARD_LENGTH_METERS + offsetVector[0],
        bestPoint[1] + direction[1] * FORWARD_LENGTH_METERS + offsetVector[1],
      ]

      features.features.push({
        type: 'Feature',
        properties: {
          index,
          valid: lane.valid,
          active: lane.valid && lane.active,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            unprojectToLonLat(startPoint, reference),
            unprojectToLonLat(endPoint, reference),
          ],
        },
      })
    })

    return features
  }, [lanes, position, geometry, heading])

  if (!laneFeatures || laneFeatures.features.length === 0) {
    return null
  }

  return (
    <Source id="lane-overlay" type="geojson" data={laneFeatures}>
      <Layer
        id="lane-overlay-base"
        type="line"
        paint={{
          'line-color': [
            'case',
            ['boolean', ['get', 'active'], false], '#84CC16',
            ['boolean', ['get', 'valid'], false], '#38BDF8',
            '#262626',
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'active'], false], 18,
            ['boolean', ['get', 'valid'], false], 12,
            8,
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'valid'], false], 0.85,
            0.4,
          ],
        }}
        layout={{
          'line-cap': 'round',
          'line-join': 'round',
        }}
      />
      <Layer
        id="lane-overlay-outline"
        type="line"
        paint={{
          'line-color': '#0C0C0C',
          'line-width': [
            'case',
            ['boolean', ['get', 'active'], false], 4,
            ['boolean', ['get', 'valid'], false], 3,
            2,
          ],
          'line-opacity': 0.7,
        }}
        layout={{
          'line-cap': 'round',
          'line-join': 'round',
        }}
      />
    </Source>
  )
}
