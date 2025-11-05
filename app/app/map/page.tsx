'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLocationService, type LocationCoordinates } from '@/lib/services/locationService'
import MapView, { type MarkerData } from './MapView'
import type {
  PartyMember,
  Profile,
  LocationUpdate,
  PartyNavigationState,
  NavigationStep,
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

        // Get route from Mapbox Directions API
        const payload = await getDrivingRoute({
          origin: currentLocation,
          destination: suggestion.coordinates,
          destinationName: suggestion.name,
          destinationAddress: suggestion.address,
        })

        let nextState: PartyNavigationState

        if (userPartyId && isPartyLeader) {
          // Party mode: save to database so all members can see it
          nextState = await saveNavigationState(supabase, userPartyId, userId, payload)
        } else {
          // Solo mode: keep navigation state local only
          nextState = buildLocalNavigationState(userId, payload)
        }

        setNavigationState(nextState)
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
    [canSelectDestination, currentLocation, userPartyId, isPartyLeader, supabase, userId]
  )

  // HANDLER: Handle map destination select (dropped pin)
  const handleMapDestinationSelect = useCallback(
    (coordinates: [number, number]) => {
      if (!canSelectDestination) {
        setNavigationError('Only the party leader can set the party destination.')
        return
      }

      void handleNavigationFromSuggestion({
        id: `pin-${Date.now()}`,
        name: 'Dropped Pin',
        address: 'Selected on map',
        coordinates,
      })
    },
    [canSelectDestination, handleNavigationFromSuggestion]
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

  // MAIN UI
  return (
    <div className="min-h-screen bg-[#0C0C0C] flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-[#171717] border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-[#FAFAFA]">
              🏍️ {isSoloMode ? 'Solo Navigation' : 'Group Navigation'}
            </h1>
            {partyName && <p className="text-xs text-[#A3A3A3] mt-1">Party: {partyName}</p>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/party')}
              className="bg-[#262626] text-[#FAFAFA] px-4 py-2 rounded-lg hover:bg-[#404040] transition-colors font-semibold"
            >
              Party
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-[#262626] text-[#FAFAFA] px-4 py-2 rounded-lg hover:bg-[#404040] transition-colors font-semibold"
            >
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="h-full max-w-7xl mx-auto space-y-4">
          {/* Notice Banner */}
          {notice && (
            <div className="bg-[#171717] border border-[#262626] rounded-lg px-4 py-3 text-sm text-[#FAFAFA] flex flex-wrap justify-between gap-3">
              <span>{notice}</span>
              {isSoloMode && (
                <button
                  onClick={() => router.push('/party')}
                  className="bg-[#84CC16] text-black px-4 py-2 rounded-lg hover:bg-[#65A30D] transition-colors font-semibold"
                >
                  Join a Party
                </button>
              )}
            </div>
          )}

          {/* Navigation Controls Section */}
          <section className="bg-[#171717] border border-[#262626] rounded-lg p-4 space-y-4">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[#FAFAFA]">Navigation</h2>
                <p className="text-xs text-[#A3A3A3]">
                  {isSoloMode
                    ? 'Search for a destination or drop a pin on the map to start navigating.'
                    : canSelectDestination
                    ? 'As party leader, set the destination for everyone in your group.'
                    : 'Following the party leader\'s route. Only the leader can change the destination.'}
                </p>
              </div>
              {navigationActive && canManageNavigation && (
                <button
                  onClick={handleClearNavigation}
                  className="bg-[#DC2626] text-[#FAFAFA] px-4 py-2 rounded-lg hover:bg-[#B91C1C] transition-colors font-semibold"
                >
                  End Navigation
                </button>
              )}
            </header>

            {/* Search Form */}
            <form onSubmit={handleSearchSubmit} className="space-y-2">
              <label htmlFor="destination" className="text-xs uppercase tracking-wide text-[#A3A3A3]">
                Destination
              </label>
              <div className="relative">
                <input
                  id="destination"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={
                    canSelectDestination
                      ? 'Search for a place or drop a pin'
                      : 'Waiting for party leader to select a destination'
                  }
                  disabled={!canSelectDestination || navigationLoading}
                  className="w-full rounded-lg border border-[#262626] bg-[#0C0C0C] px-4 py-3 text-sm text-[#FAFAFA] placeholder:text-[#525252] focus:outline-none focus:ring-2 focus:ring-[#38BDF8] disabled:opacity-60"
                />
                {searching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A3A3A3]">
                    Searching...
                  </span>
                )}
              </div>
            </form>

            {/* Navigation Error */}
            {navigationError && (
              <div className="rounded-lg border border-[#DC2626] bg-[#DC2626]/10 px-4 py-3 text-sm text-[#FCA5A5]">
                {navigationError}
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && canSelectDestination && (
              <div className="rounded-lg border border-[#262626] bg-[#0C0C0C] divide-y divide-[#1F1F1F]">
                {searchResults.map((result: PlaceSuggestion) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleNavigationFromSuggestion(result)}
                    className="w-full text-left px-4 py-3 hover:bg-[#1F2937] transition-colors"
                  >
                    <p className="text-sm font-semibold text-[#FAFAFA]">{result.name}</p>
                    {result.address && <p className="text-xs text-[#A3A3A3] mt-1">{result.address}</p>}
                  </button>
                ))}
              </div>
            )}

            {/* Active Navigation Display */}
            {destinationSummary && (
              <div className="rounded-lg border border-[#262626] bg-[#0C0C0C] p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm text-[#A3A3A3]">Active route</p>
                    <h3 className="text-lg font-semibold text-[#FAFAFA]">{destinationSummary.name}</h3>
                    {destinationSummary.address && (
                      <p className="text-xs text-[#A3A3A3] mt-1">{destinationSummary.address}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-[#FAFAFA]">
                    <p className="text-xs text-[#A3A3A3]">{formatDistance(destinationSummary.distance)}</p>
                    <p className="text-xs text-[#A3A3A3]">{formatDuration(destinationSummary.duration)}</p>
                  </div>
                </div>

                {/* Next Turn Display */}
                {activeStep && (
                  <div className="rounded-lg border border-[#38BDF8]/40 bg-[#0EA5E9]/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-[#38BDF8]">Next turn</p>
                    <p className="text-sm font-semibold text-[#FAFAFA] mt-1">{activeStep.instruction}</p>
                    <p className="text-xs text-[#A3A3A3] mt-1">
                      {formatDistance(activeStep.distance)} · {formatDuration(activeStep.duration)}
                    </p>
                    {activeStep.name && (
                      <p className="text-xs text-[#A3A3A3] mt-1">{activeStep.name}</p>
                    )}
                  </div>
                )}

                {/* Turn-by-Turn List */}
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#A3A3A3] mb-2">Turn-by-turn</p>
                  <ol className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {navigationState?.steps.map((step: NavigationStep, index) => {
                      const isActive = step.id === activeStep?.id
                      return (
                        <li
                          key={step.id}
                          className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? 'border-[#38BDF8] bg-[#1E293B]/80 text-[#FAFAFA]'
                              : 'border-[#262626] bg-[#0C0C0C] text-[#D4D4D4]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="font-semibold text-xs text-[#A3A3A3] w-6">{index + 1}</span>
                            <div className="flex-1">
                              <p className="text-xs text-[#FAFAFA] font-medium">{step.instruction}</p>
                              {step.name && <p className="text-[10px] text-[#A3A3A3] mt-1">{step.name}</p>}
                            </div>
                            <span className="text-[10px] text-[#A3A3A3] whitespace-nowrap">
                              {formatDistance(step.distance)} · {formatDuration(step.duration)}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              </div>
            )}
          </section>

          {/* Map Component */}
          <MapView
            markers={markers}
            center={currentLocation}
            zoom={14}
            className="h-[calc(100vh-220px)]"
            route={navigationState?.route_geojson}
            destination={
              navigationState
                ? {
                    name: navigationState.destination_name,
                    coordinates: navigationState.destination_coordinates,
                  }
                : null
            }
            onSelectDestination={canSelectDestination ? handleMapDestinationSelect : undefined}
            activeStep={activeStep}
          />
        </div>
      </main>

      {/* Party Members Overlay (only shown in party mode) */}
      {userPartyId && partyMembers.length > 0 && (
        <div className="absolute top-40 left-4 bg-[#0C0C0C]/90 border border-[#262626] rounded-lg p-4 backdrop-blur-sm max-w-xs">
          <h3 className="text-[#84CC16] font-bold mb-2">Party Members ({partyMembers.length})</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {partyMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between text-sm">
                <span className="text-[#FAFAFA] font-medium">
                  {member.profile.display_name || 'Anonymous'}
                  {member.user_id === userId && ' (You)'}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    member.is_online ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#DC2626]/20 text-[#DC2626]'
                  }`}
                >
                  {member.is_online ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
