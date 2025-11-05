'use client'

import { Layer, Source } from 'react-map-gl/mapbox'
import type { LaneInfo } from '@/lib/types'

interface LaneOverlayProps {
  lanes: LaneInfo[]
  position: [number, number] // lng, lat
  heading: number // direction in degrees
}

export default function LaneOverlay({ lanes, position, heading }: LaneOverlayProps) {
  if (!lanes || lanes.length === 0) {
    return null
  }

  const [lng, lat] = position
  
  // Amap-style configuration - lanes appear 100-200m ahead
  const laneStartDistance = 0.0005 // ~50 meters ahead
  const laneLength = 0.002 // ~200 meters long
  const laneWidth = 0.000035 // ~3.5 meters per lane
  const laneGap = 0.000005 // ~0.5 meter gap between lanes
  
  // Convert heading to radians
  const headingRad = (heading * Math.PI) / 180
  const perpRad = headingRad + Math.PI / 2

  // Calculate total road width
  const totalWidth = lanes.length * (laneWidth + laneGap) - laneGap
  const startOffset = -totalWidth / 2

  // Create lane polygons (like Amap 3D road rendering)
  const lanePolygons = lanes.map((lane, index) => {
    const laneOffset = startOffset + index * (laneWidth + laneGap)
    
    // Start position (ahead of vehicle)
    const startLng = lng + laneStartDistance * Math.sin(headingRad)
    const startLat = lat + laneStartDistance * Math.cos(headingRad)
    
    // End position (further ahead)
    const endLng = startLng + laneLength * Math.sin(headingRad)
    const endLat = startLat + laneLength * Math.cos(headingRad)
    
    // Calculate lane boundaries (left and right edges)
    const leftOffset = laneOffset
    const rightOffset = laneOffset + laneWidth
    
    // Four corners of the lane rectangle
    const startLeft = [
      startLng + leftOffset * Math.cos(perpRad),
      startLat + leftOffset * Math.sin(perpRad)
    ]
    const startRight = [
      startLng + rightOffset * Math.cos(perpRad),
      startLat + rightOffset * Math.sin(perpRad)
    ]
    const endRight = [
      endLng + rightOffset * Math.cos(perpRad),
      endLat + rightOffset * Math.sin(perpRad)
    ]
    const endLeft = [
      endLng + leftOffset * Math.cos(perpRad),
      endLat + leftOffset * Math.sin(perpRad)
    ]
    
    return {
      type: 'Feature' as const,
      properties: {
        valid: lane.valid,
        active: lane.active,
        laneIndex: index,
        indications: lane.indications.join(','),
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[startLeft, startRight, endRight, endLeft, startLeft]],
      },
    }
  })

  // Create lane divider lines (white dashed lines between lanes)
  const dividerLines = lanes.slice(0, -1).map((_, index) => {
    const laneOffset = startOffset + (index + 1) * (laneWidth + laneGap) - laneGap / 2
    
    const startLng = lng + laneStartDistance * Math.sin(headingRad)
    const startLat = lat + laneStartDistance * Math.cos(headingRad)
    const endLng = startLng + laneLength * Math.sin(headingRad)
    const endLat = startLat + laneLength * Math.cos(headingRad)
    
    const startPoint = [
      startLng + laneOffset * Math.cos(perpRad),
      startLat + laneOffset * Math.sin(perpRad)
    ]
    const endPoint = [
      endLng + laneOffset * Math.cos(perpRad),
      endLat + laneOffset * Math.sin(perpRad)
    ]
    
    return {
      type: 'Feature' as const,
      properties: { divider: true },
      geometry: {
        type: 'LineString' as const,
        coordinates: [startPoint, endPoint],
      },
    }
  })

  const laneGeojson = {
    type: 'FeatureCollection' as const,
    features: lanePolygons,
  }

  const dividerGeojson = {
    type: 'FeatureCollection' as const,
    features: dividerLines,
  }

  return (
    <>
      {/* Lane surfaces with gradient (Amap 3D style) */}
      <Source id="lane-surfaces" type="geojson" data={laneGeojson}>
        <Layer
          id="lane-surfaces-layer"
          type="fill"
          paint={{
            'fill-color': [
              'case',
              ['get', 'active'],
              '#84CC16', // Active lane - bright green
              ['get', 'valid'],
              '#22C55E', // Valid lane - green
              '#DC2626', // Invalid lane - red
            ],
            'fill-opacity': [
              'case',
              ['get', 'active'],
              0.8, // Very prominent
              ['get', 'valid'],
              0.5, // Visible
              0.3, // Dimmed
            ],
          }}
        />
      </Source>

      {/* Lane borders (outline effect) */}
      <Source id="lane-borders" type="geojson" data={laneGeojson}>
        <Layer
          id="lane-borders-layer"
          type="line"
          paint={{
            'line-color': [
              'case',
              ['get', 'active'],
              '#FAFAFA',
              ['get', 'valid'],
              '#A3A3A3',
              '#525252',
            ],
            'line-width': 2,
            'line-opacity': 0.6,
          }}
        />
      </Source>

      {/* Lane divider lines (dashed white lines) */}
      <Source id="lane-dividers" type="geojson" data={dividerGeojson}>
        <Layer
          id="lane-dividers-layer"
          type="line"
          paint={{
            'line-color': '#FAFAFA',
            'line-width': 2,
            'line-opacity': 0.8,
            'line-dasharray': [2, 2], // Dashed line effect
          }}
        />
      </Source>

      {/* Arrow indicators on lanes */}
      {lanes.map((lane, index) => {
        const laneOffset = startOffset + index * (laneWidth + laneGap) + laneWidth / 2
        const arrowDistance = laneStartDistance + laneLength * 0.3
        
        const arrowLng = lng + arrowDistance * Math.sin(headingRad) + laneOffset * Math.cos(perpRad)
        const arrowLat = lat + arrowDistance * Math.cos(headingRad) + laneOffset * Math.sin(perpRad)
        
        const arrowGeojson = {
          type: 'FeatureCollection' as const,
          features: [{
            type: 'Feature' as const,
            properties: {
              indication: lane.indications[0] || 'straight',
              active: lane.active,
              valid: lane.valid,
            },
            geometry: {
              type: 'Point' as const,
              coordinates: [arrowLng, arrowLat],
            },
          }],
        }
        
        return (
          <Source key={`arrow-${index}`} id={`lane-arrow-${index}`} type="geojson" data={arrowGeojson}>
            <Layer
              id={`lane-arrow-layer-${index}`}
              type="symbol"
              layout={{
                'text-field': '▲',
                'text-size': lane.active ? 32 : lane.valid ? 24 : 18,
                'text-rotate': heading,
                'text-rotation-alignment': 'map',
                'text-allow-overlap': true,
              }}
              paint={{
                'text-color': lane.active ? '#0C0C0C' : '#FAFAFA',
                'text-opacity': lane.active ? 1.0 : lane.valid ? 0.9 : 0.5,
              }}
            />
          </Source>
        )
      })}
    </>
  )
}
