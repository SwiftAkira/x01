/**
 * MapView Component
 * Mapbox GL JS integration with real-time party member tracking
 * Epic 3: Live Map Integration
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { MAPBOX_TOKEN, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, MAP_STYLE } from '@/utils/constants';
import { useParty } from '@/contexts/PartyContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  createMarkerElement,
  updateMarkerElement,
  markMarkerAsStale,
  unmarkMarkerAsStale,
} from '@/utils/mapMarkers';
import type { PartyMember } from '@/types/party.types';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox access token
mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
}

export type CenterMode = 'follow-me' | 'follow-party' | 'free';

const STALE_LOCATION_THRESHOLD = 30000; // 30 seconds
const AUTO_RECENTER_DELAY = 10000; // 10 seconds after manual pan

export default function MapView({ center = DEFAULT_MAP_CENTER, zoom = DEFAULT_MAP_ZOOM }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const staleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoCenterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { currentParty, currentUserLocation } = useParty();
  const { user } = useAuth();

  const [centerMode, setCenterMode] = useState<CenterMode>('follow-me');
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  /**
   * Initialize map
   */
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Create map instance
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center,
      zoom,
      attributionControl: false,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add attribution control at bottom-left
    map.current.addControl(
      new mapboxgl.AttributionControl({
        compact: true,
      }),
      'bottom-left'
    );

    // Track user interaction
    map.current.on('dragstart', () => {
      setIsUserInteracting(true);
      setCenterMode('free');
      
      // Reset auto-recenter timer
      if (autoCenterTimeoutRef.current) {
        clearTimeout(autoCenterTimeoutRef.current);
      }
      autoCenterTimeoutRef.current = setTimeout(() => {
        setIsUserInteracting(false);
        setCenterMode('follow-me');
      }, AUTO_RECENTER_DELAY);
    });

    map.current.on('zoomstart', () => {
      setIsUserInteracting(true);
    });

    // Cleanup on unmount
    return () => {
      if (staleCheckIntervalRef.current) {
        clearInterval(staleCheckIntervalRef.current);
      }
      if (autoCenterTimeoutRef.current) {
        clearTimeout(autoCenterTimeoutRef.current);
      }
      map.current?.remove();
      map.current = null;
    };
  }, [center, zoom]);

  /**
   * Update or create marker for a party member
   */
  const updateMemberMarker = useCallback(
    (member: PartyMember, isCurrentUser: boolean = false) => {
      if (!map.current || !member.location) return;

      const { userId, displayName, vehicleType, location } = member;
      const { latitude, longitude, speed, heading } = location;

      let marker = markersRef.current.get(userId);

      if (!marker) {
        // Create new marker
        const el = createMarkerElement(
          userId,
          displayName,
          vehicleType,
          heading,
          speed,
          isCurrentUser
        );

        marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([longitude, latitude])
          .addTo(map.current);

        markersRef.current.set(userId, marker);

        // Add click handler for marker
        el.addEventListener('click', () => {
          // Center on member
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 1000,
          });
        });
      } else {
        // Update existing marker position with animation
        const currentLngLat = marker.getLngLat();
        const newLngLat: [number, number] = [longitude, latitude];

        // Smooth transition for marker position
        const duration = 800; // ms
        const steps = 30;
        const stepDuration = duration / steps;
        let step = 0;

        const animate = () => {
          step++;
          const progress = step / steps;

          // Ease-out animation
          const easeProgress = 1 - Math.pow(1 - progress, 3);

          const lat = currentLngLat.lat + (newLngLat[1] - currentLngLat.lat) * easeProgress;
          const lng = currentLngLat.lng + (newLngLat[0] - currentLngLat.lng) * easeProgress;

          marker?.setLngLat([lng, lat]);

          if (step < steps) {
            setTimeout(animate, stepDuration);
          }
        };

        animate();

        // Update marker element (heading, speed)
        const el = marker.getElement() as HTMLDivElement;
        updateMarkerElement(el, heading, speed);
      }

      // Check if location is stale
      const locationAge = Date.now() - new Date(location.timestamp).getTime();
      const el = marker.getElement() as HTMLDivElement;

      if (locationAge > STALE_LOCATION_THRESHOLD) {
        markMarkerAsStale(el);
      } else {
        unmarkMarkerAsStale(el);
      }
    },
    []
  );

  /**
   * Remove marker for a member who left
   */
  const removeMemberMarker = useCallback((userId: number) => {
    const marker = markersRef.current.get(userId);
    if (marker) {
      marker.remove();
      markersRef.current.delete(userId);
    }
  }, []);

  /**
   * Update markers for all party members
   */
  useEffect(() => {
    if (!currentParty || !map.current) return;

    // Get current member IDs
    const currentMemberIds = new Set(currentParty.members.map((m) => m.userId));

    // Remove markers for members who left
    markersRef.current.forEach((_, userId) => {
      if (!currentMemberIds.has(userId)) {
        removeMemberMarker(userId);
      }
    });

    // Update/create markers for current members
    currentParty.members.forEach((member) => {
      const isCurrentUser = member.userId === user?.id;
      updateMemberMarker(member, isCurrentUser);
    });
  }, [currentParty, user, updateMemberMarker, removeMemberMarker]);

  /**
   * Update current user marker from location service
   */
  useEffect(() => {
    if (!currentUserLocation || !user) return;

    // Find current user in party members
    const currentUserMember = currentParty?.members.find((m) => m.userId === user.id);

    if (currentUserMember && currentUserLocation) {
      const memberWithLocation: PartyMember = {
        ...currentUserMember,
        location: {
          latitude: currentUserLocation.latitude,
          longitude: currentUserLocation.longitude,
          speed: currentUserLocation.speed || 0,
          heading: currentUserLocation.heading || 0,
          accuracy: currentUserLocation.accuracy,
          timestamp: new Date(currentUserLocation.timestamp).toISOString(),
        },
      };

      updateMemberMarker(memberWithLocation, true);
    }
  }, [currentUserLocation, user, currentParty, updateMemberMarker]);

  /**
   * Auto-center map based on mode
   */
  useEffect(() => {
    if (!map.current || isUserInteracting) return;

    if (centerMode === 'follow-me' && currentUserLocation) {
      // Center on current user
      map.current.flyTo({
        center: [currentUserLocation.longitude, currentUserLocation.latitude],
        zoom: map.current.getZoom() < 14 ? 14 : map.current.getZoom(),
        duration: 1000,
        essential: true,
      });
    } else if (centerMode === 'follow-party' && currentParty?.members) {
      // Calculate bounds to show all members
      const bounds = new mapboxgl.LngLatBounds();

      currentParty.members.forEach((member) => {
        if (member.location) {
          bounds.extend([member.location.longitude, member.location.latitude]);
        }
      });

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 },
          maxZoom: 15,
          duration: 1000,
        });
      }
    }
  }, [centerMode, currentUserLocation, currentParty, isUserInteracting]);

  /**
   * Periodic stale location check
   */
  useEffect(() => {
    staleCheckIntervalRef.current = setInterval(() => {
      // Force re-render of markers to update stale status
      if (currentParty) {
        currentParty.members.forEach((member) => {
          if (member.location) {
            const locationAge = Date.now() - new Date(member.location.timestamp).getTime();
            const marker = markersRef.current.get(member.userId);
            if (marker) {
              const el = marker.getElement() as HTMLDivElement;
              if (locationAge > STALE_LOCATION_THRESHOLD) {
                markMarkerAsStale(el);
              } else {
                unmarkMarkerAsStale(el);
              }
            }
          }
        });
      }
    }, 5000);

    return () => {
      if (staleCheckIntervalRef.current) {
        clearInterval(staleCheckIntervalRef.current);
      }
    };
  }, [currentParty]);

  /**
   * Expose center mode toggle
   */
  const toggleCenterMode = useCallback(() => {
    setCenterMode((prev) => {
      if (prev === 'follow-me') return 'follow-party';
      if (prev === 'follow-party') return 'free';
      return 'follow-me';
    });
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
        }}
      />

      {/* Center mode indicator */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500',
          cursor: 'pointer',
          userSelect: 'none',
          zIndex: 1,
        }}
        onClick={toggleCenterMode}
        title="Click to toggle center mode"
      >
        {centerMode === 'follow-me' && '📍 Following You'}
        {centerMode === 'follow-party' && '👥 Following Party'}
        {centerMode === 'free' && '🗺️ Free Navigation'}
      </div>
    </div>
  );
}
