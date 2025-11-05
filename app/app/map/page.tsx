'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLocationService, type LocationCoordinates } from '@/lib/services/locationService'
import { getVoiceNavigationService } from '@/lib/services/voiceNavigationService'
import { reportHazard } from '@/lib/services/hazardService'
import MapView, { type MarkerData } from './MapView'
import WazeBottomSheet from './WazeBottomSheet'
import type {
  PartyMember,
  Profile,
  LocationUpdate,
  PartyNavigationState,
  NavigationStep,
  HazardType,
  RouteOptions,
} from '@/lib/types'
import {
  searchPlaces,
  getDrivingRoute,
  saveNavigationState,
  clearNavigationState,
  fetchActiveNavigationState,
  subscribeToNavigationState,
  buildLocalNavigationState,
  type PlaceSuggestion,
} from '@/lib/services/navigationService'

// Extended party member type with profile and location
interface PartyMemberWithProfile extends PartyMember {
  profile: Profile
  location?: LocationUpdate
}

// Type for party membership query
interface PartyMembershipRecord {
  party_id: string
  party?: {
    is_active: boolean
    created_by: string
    name: string | null
  } | null
}

// Utility functions for formatting
const formatDuration = (seconds?: number | null): string => {
  if (!seconds || !Number.isFinite(seconds)) {
    return '--'
  }
  const totalMinutes = Math.max(1, Math.round(seconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  return `${minutes}m`
}

const formatDistance = (meters?: number | null): string => {
  if (!meters || !Number.isFinite(meters)) {
    return '--'
  }
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

export default function MapPage() {
  const router = useRouter()
  const supabase = createClient()
  const locationService = getLocationService()
  const voiceService = getVoiceNavigationService()

  // State management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [userPartyId, setUserPartyId] = useState<string | null>(null)
  const [partyName, setPartyName] = useState<string | null>(null)
  const [isPartyLeader, setIsPartyLeader] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | undefined>()
  const [partyMembers, setPartyMembers] = useState<PartyMemberWithProfile[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [navigationState, setNavigationState] = useState<PartyNavigationState | null>(null)
  const [navigationError, setNavigationError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [navigationLoading, setNavigationLoading] = useState(false)
  const [activeStep, setActiveStep] = useState<NavigationStep | null>(null)
  const [remainingDistance, setRemainingDistance] = useState<number | null>(null)
  const [remainingDuration, setRemainingDuration] = useState<number | null>(null)
  const [currentSpeed, setCurrentSpeed] = useState<number>(0)
  const [showRoutePreview, setShowRoutePreview] = useState(false)
  const [previewDestination, setPreviewDestination] = useState<PlaceSuggestion | null>(null)
  const [previewRoute, setPreviewRoute] = useState<{
    destinationName: string
    destinationAddress?: string | null
    destinationCoordinates: [number, number]
    routeGeoJSON: any
    distanceMeters: number
    durationSeconds: number
    steps: NavigationStep[]
  } | null>(null)

  // Computed values for permissions and modes
  // Solo mode: user can set their own destination
  // Party mode: only leader can set destination for everyone (like Waze group drives)
  const canSelectDestination = !userPartyId || isPartyLeader
  const canManageNavigation = !userPartyId || isPartyLeader
  const navigationActive = Boolean(navigationState?.is_active)
  const isSoloMode = !userPartyId

  // STEP 1: Initialize - check auth and get user's party membership
  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      try {
        // Check if user is authenticated
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        if (!isMounted) return

        setUserId(user.id)

        // Check if user is in an active party
        const { data: membership, error: membershipError } = await supabase
          .from('party_members')
          .select('party_id, party:parties!inner(is_active, created_by, name)')
          .eq('user_id', user.id)
          .eq('party.is_active', true)
          .maybeSingle<PartyMembershipRecord>()

        if (membershipError) {
          throw membershipError
        }

        if (!isMounted) return

        const partyRecord = membership?.party ?? null
        const activePartyId = membership?.party_id ?? null

        setUserPartyId(activePartyId)
        setPartyName(partyRecord?.name ?? null)
        setIsPartyLeader(partyRecord?.created_by === user.id)
        setNotice(
          activePartyId
            ? null
            : 'Solo Mode: Set your destination to navigate. Join a party to share your route with others.'
        )

        // Request location permission
        const hasPermission = await locationService.requestPermission()
        if (!isMounted) return

        if (!hasPermission) {
          setError('Location permission is required to use the map.')
          return
        }

        // Get initial position
        try {
          const position = await locationService.getCurrentPosition()
          if (!isMounted) return

          setCurrentLocation([position.longitude, position.latitude])

          // Save initial location if in a party
          if (activePartyId) {
            await locationService.saveLocation(activePartyId, position)
          }
        } catch (initialPositionError) {
          console.error('Failed to get initial position:', initialPositionError)
        }

        if (isMounted) {
          setLoading(false)
        }
      } catch (err) {
        console.error('Initialization error:', err)
        if (isMounted) {
          setError('Failed to initialize map')
          setLoading(false)
        }
      }
    }

    void initialize()

    return () => {
      isMounted = false
    }
  }, [router, supabase, locationService])

  // STEP 2: Track location updates continuously
  useEffect(() => {
    const handleLocationUpdate = async (position: LocationCoordinates) => {
      setCurrentLocation([position.longitude, position.latitude])
      
      // Update current speed (convert m/s to km/h)
      if (position.speed !== null && position.speed !== undefined) {
        setCurrentSpeed(position.speed * 3.6)
      }

      // Save to database only if in a party
      if (userPartyId) {
        try {
          await locationService.saveLocation(userPartyId, position)
        } catch (err) {
          console.error('Failed to save location:', err)
        }
      }
    }

    const handleLocationError = (err: GeolocationPositionError) => {
      console.error('Location tracking error:', err)
      setError(`Location error: ${err.message}`)
    }

    locationService.startTracking(handleLocationUpdate, handleLocationError)

    return () => {
      locationService.stopTracking()
    }
  }, [userPartyId, locationService])

  // STEP 3: Fetch party members (only if in party)
  const fetchPartyMembers = useCallback(async () => {
    if (!userPartyId) return

    try {
      const { data, error: fetchError } = await supabase
        .from('party_members')
        .select('*, profile:profiles!inner(*)')
        .eq('party_id', userPartyId)
        .order('joined_at', { ascending: true })

      if (fetchError) throw fetchError

      setPartyMembers(data || [])
    } catch (err) {
      console.error('Failed to fetch party members:', err)
    }
  }, [userPartyId, supabase])

  // STEP 4: Subscribe to party changes (location updates and member changes)
  useEffect(() => {
    if (!userPartyId) return

    fetchPartyMembers()

    // Subscribe to location updates
    const locationChannel = supabase
      .channel(`location_updates:${userPartyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_updates',
          filter: `party_id=eq.${userPartyId}`,
        },
        (payload) => {
          const newLocation = payload.new as LocationUpdate

          setPartyMembers((prev) =>
            prev.map((member) =>
              member.user_id === newLocation.user_id
                ? { ...member, location: newLocation }
                : member
            )
          )
        }
      )
      .subscribe()

    // Subscribe to member changes
    const membersChannel = supabase
      .channel(`party_members:${userPartyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'party_members',
          filter: `party_id=eq.${userPartyId}`,
        },
        () => {
          fetchPartyMembers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(locationChannel)
      supabase.removeChannel(membersChannel)
    }
  }, [userPartyId, supabase, fetchPartyMembers])

  // STEP 5: Fetch latest locations for party members
  useEffect(() => {
    if (!userPartyId || partyMembers.length === 0) return

    const fetchLatestLocations = async () => {
      try {
        const { data: locations } = await supabase
          .from('location_updates')
          .select('*')
          .eq('party_id', userPartyId)
          .order('created_at', { ascending: false })

        if (locations) {
          const latestByUser = new Map<string, LocationUpdate>()
          locations.forEach((loc) => {
            if (!latestByUser.has(loc.user_id)) {
              latestByUser.set(loc.user_id, loc)
            }
          })

          setPartyMembers((prev) =>
            prev.map((member) => ({
              ...member,
              location: latestByUser.get(member.user_id),
            }))
          )
        }
      } catch (err) {
        console.error('Failed to fetch locations:', err)
      }
    }

    void fetchLatestLocations()
  }, [userPartyId, supabase, partyMembers.length])

  // STEP 6: Subscribe to navigation state (party mode only)
  useEffect(() => {
    if (!userId) return

    if (userPartyId) {
      // Party mode: listen to party navigation state from database
      let active = true

      fetchActiveNavigationState(supabase, userPartyId)
        .then((state: PartyNavigationState | null) => {
          if (active) {
            setNavigationState(state)
          }
        })
        .catch((err: unknown) => {
          console.error('Failed to fetch navigation state:', err)
        })

      const unsubscribe = subscribeToNavigationState(
        supabase,
        userPartyId,
        (state: PartyNavigationState | null) => {
          setNavigationState(state)
        }
      )

      return () => {
        active = false
        unsubscribe()
      }
    }
    // Solo mode: navigation state is stored locally only
  }, [userPartyId, userId, supabase])

  // STEP 7: Search for places as user types
  useEffect(() => {
    if (!canSelectDestination) {
      setSearchResults([])
      return
    }

    const trimmed = searchQuery.trim()
    if (trimmed.length < 3) {
      setSearchResults([])
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(() => {
      setSearching(true)
      searchPlaces(trimmed, {
        proximity: currentLocation,
        signal: controller.signal,
      })
        .then((results: PlaceSuggestion[]) => {
          setSearchResults(results)
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') {
            return
          }
          console.error('Place search failed:', err)
        })
        .finally(() => {
          setSearching(false)
        })
    }, 350)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [searchQuery, currentLocation, canSelectDestination])

  // STEP 8: Calculate active step and remaining distance/duration
  useEffect(() => {
    if (!navigationState || !currentLocation || navigationState.steps.length === 0) {
      setActiveStep(null)
      setRemainingDistance(navigationState ? navigationState.distance_meters : null)
      setRemainingDuration(navigationState ? navigationState.duration_seconds : null)
      return
    }

    // Find closest step based on user's current location
    let closestIndex = 0
    let closestDistance = Number.POSITIVE_INFINITY

    navigationState.steps.forEach((step, index) => {
      const [stepLng, stepLat] = step.maneuverLocation
      const distance = Math.sqrt(
        Math.pow(currentLocation[1] - stepLat, 2) +
        Math.pow(currentLocation[0] - stepLng, 2)
      )

      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    })

    // Calculate remaining steps, distance, and duration
    const remainingSteps = navigationState.steps.slice(closestIndex)
    const distanceMeters = remainingSteps.reduce((sum, step) => sum + step.distance, 0)
    const durationSeconds = remainingSteps.reduce((sum, step) => sum + step.duration, 0)

    setActiveStep(remainingSteps[0] ?? null)
    setRemainingDistance(distanceMeters)
    setRemainingDuration(durationSeconds)
  }, [navigationState, currentLocation])

  // STEP 9: Clear navigation if user leaves party
  useEffect(() => {
    if (!userPartyId && navigationState?.party_id) {
      setNavigationState(null)
    }
  }, [userPartyId, navigationState?.party_id])

  // HANDLER: Start navigation from search suggestion or map pin
  const handleNavigationFromSuggestion = useCallback(
    async (suggestion: PlaceSuggestion) => {
      if (!canSelectDestination) {
        setNavigationError('Only the party leader can set the party destination.')
        return
      }

      if (!currentLocation) {
        setNavigationError('Waiting for your current location...')
        return
      }

      if (!userId) {
        setNavigationError('User not authenticated')
        return
      }

      try {
        setNavigationError(null)
        setNavigationLoading(true)

        console.log('Calculating route preview from', currentLocation, 'to', suggestion.coordinates)

        // Get route from Mapbox Directions API for preview
        const payload = await getDrivingRoute({
          origin: currentLocation,
          destination: suggestion.coordinates,
          destinationName: suggestion.name,
          destinationAddress: suggestion.address,
        })

        console.log('Route calculated successfully:', payload)

        // Show route preview instead of immediately starting navigation
        setPreviewRoute(payload)
        setPreviewDestination(suggestion)
        setShowRoutePreview(true)
        setSearchResults([])
        setSearchQuery('')
      } catch (err) {
        console.error('Navigation error:', err)
        setNavigationError(
          err instanceof Error ? err.message : 'Failed to calculate route'
        )
      } finally {
        setNavigationLoading(false)
      }
    },
    [canSelectDestination, currentLocation, userId]
  )

  // HANDLER: Start navigation from route preview
  const handleStartNavigation = useCallback(
    async () => {
      if (!previewRoute || !userId) return

      try {
        let nextState: PartyNavigationState

        if (userPartyId && isPartyLeader) {
          // Party mode: save to database so all members can see it
          nextState = await saveNavigationState(supabase, userPartyId, userId, previewRoute)
        } else {
          // Solo mode: keep navigation state local only
          nextState = buildLocalNavigationState(userId, previewRoute)
        }

        setNavigationState(nextState)
        setShowRoutePreview(false)
        setPreviewRoute(null)
        setPreviewDestination(null)
      } catch (err) {
        console.error('Failed to start navigation:', err)
        setNavigationError(
          err instanceof Error ? err.message : 'Failed to start navigation'
        )
      }
    },
    [previewRoute, userId, userPartyId, isPartyLeader, supabase]
  )

  // HANDLER: Clear/end navigation
  const handleClearNavigation = useCallback(async () => {
    if (!navigationActive) {
      setNavigationState(null)
      setSearchQuery('')
      return
    }

    if (!canManageNavigation) {
      return
    }

    try {
      setNavigationError(null)
      if (userPartyId) {
        // Party mode: clear from database
        await clearNavigationState(supabase, userPartyId)
      }
      // Reset local state
      setNavigationState(null)
      setActiveStep(null)
      setRemainingDistance(null)
      setRemainingDuration(null)
      setSearchQuery('')
    } catch (err) {
      console.error('Failed to clear navigation state:', err)
      setNavigationError('Unable to end navigation right now. Please try again.')
    }
  }, [navigationActive, canManageNavigation, userPartyId, supabase])

  // HANDLER: Handle search form submit
  // Handler for search input from WazeBottomSheet
  const handleSearch = useCallback(
    async (query: string) => {
      if (query.length < 3) {
        setSearchResults([])
        return
      }

      try {
        setSearching(true)
        const results = await searchPlaces(query, {
          proximity: currentLocation,
        })
        setSearchResults(results)
      } catch (err) {
        console.error('Search error:', err)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    },
    [currentLocation]
  )

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (searchResults.length > 0) {
        void handleNavigationFromSuggestion(searchResults[0])
      }
    },
    [searchResults, handleNavigationFromSuggestion]
  )

  // Build markers array for map display
  const markers: MarkerData[] = partyMembers
    .filter((member) => member.location)
    .map((member) => ({
      id: member.user_id,
      latitude: member.location!.latitude,
      longitude: member.location!.longitude,
      displayName: member.profile.display_name || 'Anonymous',
      speed: member.location!.speed,
      heading: member.location!.heading,
      isCurrentUser: member.user_id === userId,
    }))

  // Add current user marker if not in party or not already in markers
  if (currentLocation && userId) {
    const hasCurrentMarker = markers.some((marker) => marker.id === userId)
    if (!hasCurrentMarker) {
      markers.push({
        id: userId,
        latitude: currentLocation[1],
        longitude: currentLocation[0],
        displayName: 'You',
        isCurrentUser: true,
      })
    }
  }

  // LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#84CC16] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[#FAFAFA] font-semibold">Loading Map...</p>
          <p className="text-[#A3A3A3] text-sm mt-2">Requesting location permission</p>
        </div>
      </div>
    )
  }

  // ERROR STATE
  if (error) {
    return (
      <div className="min-h-screen bg-[#0C0C0C]">
        <nav className="bg-[#171717] border-b border-[#262626]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-extrabold text-[#FAFAFA]">SpeedLink Map</h1>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-[#171717] border border-[#DC2626] rounded-xl p-6 text-center">
            <p className="text-[#DC2626] font-bold mb-4">{error}</p>
            <button
              onClick={() => router.push('/party')}
              className="bg-[#84CC16] text-black px-6 py-3 rounded-lg hover:bg-[#65A30D] transition-colors font-bold"
            >
              Go to Party Management
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Prepare destination summary for UI
  const destinationSummary = navigationState
    ? {
        name: navigationState.destination_name,
        address: navigationState.destination_address,
        distance: remainingDistance ?? navigationState.distance_meters,
        duration: remainingDuration ?? navigationState.duration_seconds,
      }
    : null

  // Helper function for maneuver icons
  const getManeuverIcon = (type?: string | null, modifier?: string | null): string => {
    if (!type) return '→';
    
    const maneuverMap: Record<string, string> = {
      'turn-slight-left': '↖',
      'turn-left': '←',
      'turn-sharp-left': '↙',
      'turn-slight-right': '↗',
      'turn-right': '→',
      'turn-sharp-right': '↘',
      'straight': '↑',
      'uturn': '↩',
      'roundabout': '⟳',
      'arrive': '📍',
    };

    const key = modifier ? `${type}-${modifier}` : type;
    return maneuverMap[key] || maneuverMap[type] || '→';
  };

  // MAIN UI
  return (
    <div className="h-screen bg-[#0C0C0C] flex flex-col overflow-hidden">
      {/* Active Navigation Banner - Top (Compact) */}
      {navigationActive && activeStep && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-[#0C0C0C]/95 backdrop-blur-sm border border-[#262626] rounded-2xl shadow-xl px-4 py-2 max-w-[90vw]">
          <div className="flex items-center gap-2">
            <div className="text-2xl">{activeStep.maneuverType ? getManeuverIcon(activeStep.maneuverType, activeStep.maneuverModifier) : '→'}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#FAFAFA] truncate">
                {activeStep.instruction}
              </div>
              <div className="text-[10px] text-[#84CC16]">
                {formatDistance(activeStep.distance)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-[#84CC16]">
                {formatDuration(remainingDuration)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full relative">
          {/* Map Component - Full screen */}
          <div className="fixed inset-0 z-0">
            <MapView
              markers={markers}
              center={currentLocation}
              zoom={14}
              className="h-full w-full"
              route={navigationState?.route_geojson}
              destination={
                navigationState
                  ? {
                      name: navigationState.destination_name,
                      coordinates: navigationState.destination_coordinates,
                    }
                  : null
              }

              activeStep={activeStep}
            />
          </div>
        </div>
      </main>

      {/* Party Members Overlay - Compact (only shown in party mode) */}
      {userPartyId && partyMembers.length > 0 && (
        <div className="fixed top-2 left-2 bg-[#0C0C0C]/90 border border-[#262626] rounded-xl p-2 backdrop-blur-sm max-w-40 z-50">
          <h3 className="text-[#84CC16] font-semibold text-xs mb-1.5">Party ({partyMembers.length})</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {partyMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-1.5 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full ${member.is_online ? 'bg-[#22C55E]' : 'bg-[#DC2626]'}`} />
                <span className="text-[#FAFAFA] truncate flex-1">
                  {member.profile.display_name || 'Anonymous'}
                  {member.user_id === userId && ' (You)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Route Preview Screen */}
      {showRoutePreview && previewRoute && previewDestination && (
        <div className="fixed inset-0 z-60 bg-[#0C0C0C] flex flex-col">
          {/* Header */}
          <div className="bg-[#171717] border-b border-[#262626] px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => {
                setShowRoutePreview(false)
                setPreviewRoute(null)
                setPreviewDestination(null)
              }}
              className="text-[#FAFAFA] hover:text-[#84CC16]"
            >
              ← Back
            </button>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[#FAFAFA]">{currentLocation ? 'Your Location' : 'Start'}</div>
              <div className="text-xs text-[#A3A3A3]">→ {previewDestination.name}</div>
            </div>
          </div>

          {/* Map with Route */}
          <div className="flex-1 relative">
            <MapView
              center={currentLocation}
              zoom={12}
              className="h-full w-full"
              route={previewRoute.routeGeoJSON}
              destination={{
                name: previewDestination.name,
                coordinates: previewDestination.coordinates,
              }}
              markers={currentLocation ? [{
                id: 'current',
                latitude: currentLocation[1],
                longitude: currentLocation[0],
                isCurrentUser: true,
              }] : []}
              fitBounds={true}
            />
          </div>

          {/* Route Info Panel */}
          <div className="bg-[#171717] border-t border-[#262626] p-4 space-y-3">
            {/* Main Route */}
            <div>
              <div className="flex items-end gap-2 mb-2">
                <div className="text-3xl font-bold text-[#FAFAFA]">{formatDuration(previewRoute.durationSeconds)}</div>
                <div className="text-lg text-[#A3A3A3] mb-1">{formatDistance(previewRoute.distanceMeters)}</div>
              </div>
              <div className="text-sm text-[#FAFAFA] mb-1">Via {previewRoute.destinationAddress || previewRoute.destinationName}</div>
              <div className="text-xs text-[#22C55E]">Best route, Typical traffic</div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowRoutePreview(false)
                  setPreviewRoute(null)
                  setPreviewDestination(null)
                }}
                className="py-4 bg-[#262626] hover:bg-[#404040] text-[#84CC16] rounded-2xl font-semibold text-lg transition-colors"
              >
                Leave later
              </button>
              <button
                onClick={handleStartNavigation}
                className="py-4 bg-[#84CC16] hover:bg-[#65A30D] text-[#0C0C0C] rounded-2xl font-semibold text-lg transition-colors"
              >
                Go now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waze-Style Bottom Sheet */}
      {!showRoutePreview && (
        <WazeBottomSheet
          isNavigating={navigationActive}
          currentStep={activeStep}
          remainingDistance={remainingDistance}
          remainingDuration={remainingDuration}
          currentSpeed={currentSpeed}
        onStopNavigation={async () => {
          if (userPartyId && isPartyLeader) {
            await clearNavigationState(supabase, userPartyId)
          }
          setNavigationState(null)
          setActiveStep(null)
          voiceService.stop()
        }}
        onReportHazard={async (hazardType: HazardType) => {
          if (!userPartyId || !currentLocation) return
          
          await reportHazard({
            party_id: userPartyId,
            hazard_type: hazardType,
            latitude: currentLocation[1],
            longitude: currentLocation[0],
          })
        }}
        onChangeRoute={async (_options: RouteOptions) => {
          if (!navigationState || !currentLocation || !userId) return
          
          try {
            // TODO: Use route options (fastest/shortest, avoid highways/tolls)
            // This requires updating navigationService.ts to accept RouteOptions
            const payload = await getDrivingRoute({
              origin: currentLocation,
              destination: navigationState.destination_coordinates,
              destinationName: navigationState.destination_name,
              destinationAddress: navigationState.destination_address || undefined,
            })

            let nextState: PartyNavigationState
            if (userPartyId && isPartyLeader) {
              nextState = await saveNavigationState(supabase, userPartyId, userId, payload)
            } else {
              nextState = buildLocalNavigationState(userId, payload)
            }
            setNavigationState(nextState)
          } catch (err) {
            console.error('Failed to recalculate route:', err)
          }
        }}
        onSearch={handleSearch}
        searchResults={searchResults}
        onSelectDestination={handleNavigationFromSuggestion}
        searching={searching}
        onDismiss={
          navigationActive
            ? undefined // Don't allow dismissing while navigating
            : () => {
                // Clear search when dismissing search view
                setSearchResults([])
              }
        }
        />
      )}
    </div>
  )
}
