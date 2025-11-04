/**
 * Party Context
 * Global state management for party features with WebSocket integration
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { partyApi } from '@/services/api';
import { getStorageItem } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';
import { locationService, LocationPosition } from '@/services/location.service';
import type { 
  Party, 
  LocationBroadcast, 
  MessageBroadcast,
  PartyError,
  LocationUpdatePayload
} from '@/types/party.types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

interface PartyContextState {
  // Party state
  currentParty: Party | null;
  isInParty: boolean;
  isLoading: boolean;
  error: PartyError | null;
  isConnected: boolean;

  // Party actions
  createParty: (name?: string) => Promise<void>;
  joinParty: (code: string) => Promise<void>;
  leaveParty: () => Promise<void>;
  
  // Location state and actions
  isLocationSharing: boolean;
  locationError: string | null;
  currentUserLocation: LocationPosition | null;
  startLocationSharing: () => Promise<void>;
  stopLocationSharing: () => void;
  updateLocation: (location: LocationUpdatePayload['location']) => void;
  
  // Message actions
  sendMessage: (message: string) => void;
  messages: MessageBroadcast[];
  
  // Utility
  clearError: () => void;
}

const PartyContext = createContext<PartyContextState | undefined>(undefined);

export const PartyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentParty, setCurrentParty] = useState<Party | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PartyError | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<MessageBroadcast[]>([]);
  
  // Location tracking state
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentUserLocation, setCurrentUserLocation] = useState<LocationPosition | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const locationUpdateThrottleRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize WebSocket connection
   */
  const initializeWebSocket = useCallback(() => {
    const token = getStorageItem<string>(STORAGE_KEYS.AUTH_TOKEN);
    
    if (!token) {
      console.error('No auth token for WebSocket connection');
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current?.connected) {
      socketRef.current.disconnect();
    }

    // Create new socket connection
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('🔌 WebSocket connected:', socket.id);
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setError({
        code: 'CONNECTION_ERROR',
        message: 'Failed to connect to real-time server',
      });
      setIsConnected(false);
    });

    // Party events
    socket.on('party:created', (data) => {
      console.log('Party created:', data);
      setCurrentParty({
        ...data,
        members: [],
      });
      setIsLoading(false);
    });

    socket.on('party:joined', (party: Party) => {
      console.log('Party joined:', party);
      setCurrentParty(party);
      setMessages([]);
      setIsLoading(false);
    });

    socket.on('party:left', () => {
      console.log('Party left');
      setCurrentParty(null);
      setMessages([]);
    });

    socket.on('party:member-joined', ({ userId }) => {
      console.log('Member joined:', userId);
      setCurrentParty((prev) => {
        if (!prev) return prev;
        
        // Fetch updated party state from API
        partyApi.getDetails(prev.id.toString()).then((response) => {
          if (response.success) {
            setCurrentParty(response.data);
          }
        });
        
        return prev;
      });
    });

    socket.on('party:member-left', ({ userId }) => {
      console.log('Member left:', userId);
      setCurrentParty((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.filter((m) => m.userId !== userId),
        };
      });
    });

    socket.on('party:member-online', ({ userId }) => {
      setCurrentParty((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.userId === userId ? { ...m, isOnline: true } : m
          ),
        };
      });
    });

    socket.on('party:member-offline', ({ userId }) => {
      setCurrentParty((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.userId === userId ? { ...m, isOnline: false } : m
          ),
        };
      });
    });

    socket.on('party:location-update', (location: LocationBroadcast) => {
      setCurrentParty((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.userId === location.userId
              ? { ...m, location: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  speed: location.speed,
                  heading: location.heading,
                  accuracy: location.accuracy,
                  timestamp: location.timestamp,
                }}
              : m
          ),
        };
      });
    });

    socket.on('party:message-received', (message: MessageBroadcast) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('error', (err: PartyError) => {
      console.error('Party error:', err);
      setError(err);
      setIsLoading(false);
    });

    return socket;
  }, []);

  /**
   * Initialize WebSocket on mount
   */
  useEffect(() => {
    const socket = initializeWebSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [initializeWebSocket]);

  /**
   * Create a new party
   */
  const createParty = useCallback(async (name?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Create party via REST API
      const response = await partyApi.create({ name });
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create party');
      }

      // Join party room via WebSocket
      if (socketRef.current?.connected && response.data) {
        socketRef.current.emit('party:join', { code: response.data.code });
      }

    } catch (err: any) {
      console.error('Create party error:', err);
      setError({
        code: 'CREATE_PARTY_ERROR',
        message: err.response?.data?.error?.message || err.message || 'Failed to create party',
      });
      setIsLoading(false);
    }
  }, []);

  /**
   * Join a party by code
   */
  const joinParty = useCallback(async (code: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate code format
      if (!/^\d{6}$/.test(code)) {
        throw new Error('Party code must be 6 digits');
      }

      // Join via WebSocket
      if (socketRef.current?.connected) {
        socketRef.current.emit('party:join', { code });
      } else {
        throw new Error('WebSocket not connected');
      }

    } catch (err: any) {
      console.error('Join party error:', err);
      setError({
        code: 'JOIN_PARTY_ERROR',
        message: err.response?.data?.error?.message || err.message || 'Failed to join party',
      });
      setIsLoading(false);
    }
  }, []);

  /**
   * Leave the current party
   */
  const leaveParty = useCallback(async () => {
    if (!currentParty) return;

    try {
      setIsLoading(true);
      setError(null);

      // Leave via WebSocket
      if (socketRef.current?.connected) {
        socketRef.current.emit('party:leave', { partyId: currentParty.id });
      }

      // Also call REST API for persistence
      await partyApi.leave(currentParty.id.toString());

      setCurrentParty(null);
      setMessages([]);
      setIsLoading(false);

    } catch (err: any) {
      console.error('Leave party error:', err);
      setError({
        code: 'LEAVE_PARTY_ERROR',
        message: err.response?.data?.error?.message || err.message || 'Failed to leave party',
      });
      setIsLoading(false);
    }
  }, [currentParty]);

  /**
   * Update user location
   */
  const updateLocation = useCallback((location: LocationUpdatePayload['location']) => {
    if (!currentParty || !socketRef.current?.connected) return;

    socketRef.current.emit('party:update', {
      partyId: currentParty.id,
      location,
    });
  }, [currentParty]);

  /**
   * Send a message to the party
   */
  const sendMessage = useCallback((message: string) => {
    if (!currentParty || !socketRef.current?.connected) return;

    socketRef.current.emit('party:message', {
      partyId: currentParty.id,
      message,
    });
  }, [currentParty]);

  /**
   * Start location sharing
   */
  const startLocationSharing = useCallback(async () => {
    try {
      setLocationError(null);

      // Check if geolocation is supported
      if (!locationService.isSupported()) {
        throw new Error('Geolocation is not supported by your browser');
      }

      // Request permission and get initial position
      const initialPosition = await locationService.requestPermission();
      setCurrentUserLocation(initialPosition);
      setIsLocationSharing(true);

      // Start watching position with callback
      locationService.startWatching(
        (position: LocationPosition) => {
          setCurrentUserLocation(position);

          // Throttle location updates to server (max 1 per second)
          if (!locationUpdateThrottleRef.current && currentParty) {
            locationUpdateThrottleRef.current = setTimeout(() => {
              locationUpdateThrottleRef.current = null;
            }, 1000);

            // Send location to party via WebSocket
            if (socketRef.current?.connected) {
              socketRef.current.emit('party:update', {
                partyId: currentParty.id,
                location: {
                  latitude: position.latitude,
                  longitude: position.longitude,
                  speed: position.speed || 0,
                  heading: position.heading || 0,
                  accuracy: position.accuracy,
                },
              });
            }
          }
        },
        (err) => {
          console.error('Location tracking error:', err);
          setLocationError(err.message);
          setIsLocationSharing(false);
        }
      );

    } catch (err: any) {
      console.error('Failed to start location sharing:', err);
      setLocationError(err.message || 'Failed to start location sharing');
      setIsLocationSharing(false);
    }
  }, [currentParty]);

  /**
   * Stop location sharing
   */
  const stopLocationSharing = useCallback(() => {
    locationService.stopWatching();
    setIsLocationSharing(false);
    setLocationError(null);
  }, []);

  /**
   * Auto-start location sharing when joining a party
   */
  useEffect(() => {
    if (currentParty && !isLocationSharing) {
      startLocationSharing();
    } else if (!currentParty && isLocationSharing) {
      stopLocationSharing();
    }
  }, [currentParty, isLocationSharing, startLocationSharing, stopLocationSharing]);

  /**
   * Cleanup location tracking on unmount
   */
  useEffect(() => {
    return () => {
      if (isLocationSharing) {
        locationService.stopWatching();
      }
      if (locationUpdateThrottleRef.current) {
        clearTimeout(locationUpdateThrottleRef.current);
      }
    };
  }, [isLocationSharing]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: PartyContextState = {
    currentParty,
    isInParty: currentParty !== null,
    isLoading,
    error,
    isConnected,
    createParty,
    joinParty,
    leaveParty,
    isLocationSharing,
    locationError,
    currentUserLocation,
    startLocationSharing,
    stopLocationSharing,
    updateLocation,
    sendMessage,
    messages,
    clearError,
  };

  return <PartyContext.Provider value={value}>{children}</PartyContext.Provider>;
};

/**
 * Hook to use party context
 */
export const useParty = (): PartyContextState => {
  const context = useContext(PartyContext);
  
  if (!context) {
    throw new Error('useParty must be used within a PartyProvider');
  }
  
  return context;
};
