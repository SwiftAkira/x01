import type { SupabaseClient } from '@supabase/supabase-js'
import type { FeatureCollection, LineString } from 'geojson'
import type { NavigationStep, PartyNavigationState } from '@/lib/types'

const MAPBOX_GEOCODING_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places'
const MAPBOX_DIRECTIONS_BASE = 'https://api.mapbox.com/directions/v5/mapbox/driving'

interface MapboxFeature {
  id: string
  place_name: string
  text: string
  properties?: {
    address?: string
  }
  center: [number, number]
}

interface MapboxGeocodingResponse {
  features: MapboxFeature[]
}

interface MapboxDirectionsResponse {
  routes: Array<{
    distance: number
    duration: number
    geometry: {
      coordinates: [number, number][]
      type: 'LineString'
    }
    legs: Array<{
      steps: Array<{
        distance: number
        duration: number
        name?: string
        geometry: {
          coordinates: [number, number][]
          type: 'LineString'
        }
        maneuver: {
          instruction: string
          type?: string
          modifier?: string
          location: [number, number]
        }
        intersections?: Array<{
          lanes?: Array<{
            valid: boolean
            active?: boolean
            indications: string[]
          }>
        }>
      }>
    }>
  }>
}

export interface PlaceSuggestion {
  id: string
  name: string
  address?: string
  coordinates: [number, number]
}

export interface ComputedNavigationPayload {
  destinationName: string
  destinationAddress?: string | null
  destinationCoordinates: [number, number]
  routeGeoJSON: FeatureCollection<LineString>
  distanceMeters: number
  durationSeconds: number
  steps: NavigationStep[]
}

interface NavigationRow {
  id: string
  party_id: string
  created_by: string
  destination_name: string
  destination_address: string | null
  destination_lat: number
  destination_lng: number
  distance_meters: number
  duration_seconds: number
  route_geojson: FeatureCollection<LineString>
  steps: NavigationStep[]
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SearchOptions {
  proximity?: [number, number]
  signal?: AbortSignal
}

interface DirectionsOptions {
  origin: [number, number]
  destination: [number, number]
  destinationName: string
  destinationAddress?: string | null
}

const ensureMapboxToken = (): string => {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) {
    throw new Error('Mapbox token not configured')
  }
  return token
}

const mapToNavigationState = (row: NavigationRow): PartyNavigationState => ({
  party_id: row.party_id,
  created_by: row.created_by,
  destination_name: row.destination_name,
  destination_address: row.destination_address,
  destination_coordinates: [row.destination_lng, row.destination_lat],
  distance_meters: row.distance_meters,
  duration_seconds: row.duration_seconds,
  route_geojson: row.route_geojson,
  steps: row.steps,
  is_active: row.is_active,
  created_at: row.created_at,
  updated_at: row.updated_at,
})

export const searchPlaces = async (
  query: string,
  options: SearchOptions = {}
): Promise<PlaceSuggestion[]> => {
  const token = ensureMapboxToken()
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const params = new URLSearchParams({
    access_token: token,
    autocomplete: 'true',
    limit: '5',
    language: 'en',
  })

  if (options.proximity) {
    const [longitude, latitude] = options.proximity
    params.set('proximity', `${longitude},${latitude}`)
  }

  const response = await fetch(
    `${MAPBOX_GEOCODING_BASE}/${encodeURIComponent(trimmed)}.json?${params.toString()}`,
    {
      signal: options.signal,
    }
  )

  if (!response.ok) {
    throw new Error('Mapbox place search failed')
  }

  const data = (await response.json()) as MapboxGeocodingResponse

  return (data.features || []).map((feature) => ({
    id: feature.id,
    name: feature.text,
    address: feature.place_name,
    coordinates: feature.center,
  }))
}

export const getDrivingRoute = async (
  options: DirectionsOptions
): Promise<ComputedNavigationPayload> => {
  const token = ensureMapboxToken()
  const { origin, destination, destinationName, destinationAddress } = options
  const [originLng, originLat] = origin
  const [destinationLng, destinationLat] = destination

  const params = new URLSearchParams({
    access_token: token,
    alternatives: 'false',
    geometries: 'geojson',
    overview: 'full',
    steps: 'true',
    language: 'en',
    banner_instructions: 'true',
    voice_instructions: 'true',
  })

  const response = await fetch(
    `${MAPBOX_DIRECTIONS_BASE}/${originLng},${originLat};${destinationLng},${destinationLat}?${params.toString()}`
  )

  if (!response.ok) {
    throw new Error('Mapbox directions request failed')
  }

  const data = (await response.json()) as MapboxDirectionsResponse
  const [route] = data.routes

  if (!route) {
    throw new Error('No routes available for the selected destination')
  }

  const routeFeature: FeatureCollection<LineString> = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route.geometry.coordinates,
        },
      },
    ],
  }

  const steps: NavigationStep[] = []

  route.legs.forEach((leg, legIndex) => {
    leg.steps.forEach((step, stepIndex) => {
      // Extract lane information from the first intersection if available
      const lanes = step.intersections?.[0]?.lanes?.map(lane => ({
        valid: lane.valid,
        active: lane.active ?? false,
        indications: lane.indications,
      }))

      steps.push({
        id: `${legIndex}-${stepIndex}`,
        instruction: step.maneuver.instruction,
        distance: step.distance,
        duration: step.duration,
        name: step.name ?? null,
        maneuverType: step.maneuver.type ?? null,
        maneuverModifier: step.maneuver.modifier ?? null,
        maneuverLocation: step.maneuver.location,
  geometry: step.geometry.coordinates,
        lanes: lanes && lanes.length > 0 ? lanes : undefined,
      })
    })
  })

  return {
    destinationName,
    destinationAddress: destinationAddress ?? null,
    destinationCoordinates: destination,
    routeGeoJSON: routeFeature,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    steps,
  }
}

export const saveNavigationState = async (
  supabase: SupabaseClient,
  partyId: string,
  userId: string,
  payload: ComputedNavigationPayload
): Promise<PartyNavigationState> => {
  const { data, error } = await supabase
    .from('party_navigation_states')
    .upsert(
      {
        party_id: partyId,
        created_by: userId,
        destination_name: payload.destinationName,
        destination_address: payload.destinationAddress ?? null,
        destination_lat: payload.destinationCoordinates[1],
        destination_lng: payload.destinationCoordinates[0],
        distance_meters: payload.distanceMeters,
        duration_seconds: payload.durationSeconds,
        route_geojson: payload.routeGeoJSON,
        steps: payload.steps,
        is_active: true,
      },
      { onConflict: 'party_id' }
    )
    .select()
    .maybeSingle<NavigationRow>()

  if (error || !data) {
    throw error ?? new Error('Failed to persist navigation state')
  }

  return mapToNavigationState(data)
}

export const clearNavigationState = async (
  supabase: SupabaseClient,
  partyId: string
): Promise<void> => {
  const { error } = await supabase
    .from('party_navigation_states')
    .update({ is_active: false })
    .eq('party_id', partyId)

  if (error) {
    throw error
  }
}

export const fetchActiveNavigationState = async (
  supabase: SupabaseClient,
  partyId: string
): Promise<PartyNavigationState | null> => {
  const { data, error } = await supabase
    .from('party_navigation_states')
    .select('*')
    .eq('party_id', partyId)
    .eq('is_active', true)
    .maybeSingle<NavigationRow>()

  if (error) {
    throw error
  }

  return data ? mapToNavigationState(data) : null
}

export const subscribeToNavigationState = (
  supabase: SupabaseClient,
  partyId: string,
  callback: (state: PartyNavigationState | null) => void
): (() => void) => {
  const channel = supabase
    .channel(`party_navigation_states:${partyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'party_navigation_states',
        filter: `party_id=eq.${partyId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          callback(null)
          return
        }

        const next = payload.new as NavigationRow | null
        if (!next || !next.is_active) {
          callback(null)
          return
        }

        callback(mapToNavigationState(next))
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export const buildLocalNavigationState = (
  userId: string,
  payload: ComputedNavigationPayload
): PartyNavigationState => ({
  party_id: null,
  created_by: userId,
  destination_name: payload.destinationName,
  destination_address: payload.destinationAddress ?? null,
  destination_coordinates: payload.destinationCoordinates,
  distance_meters: payload.distanceMeters,
  duration_seconds: payload.durationSeconds,
  route_geojson: payload.routeGeoJSON,
  steps: payload.steps,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
