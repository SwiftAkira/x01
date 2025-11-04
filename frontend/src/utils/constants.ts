/**
 * Application Constants
 * Central location for all app-wide constants
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// App Configuration
export const APP_NAME = 'SpeedLink';
export const APP_VERSION = '0.1.0';

// Party Configuration
export const PARTY_CODE_LENGTH = 6;
export const MAX_PARTY_SIZE = 20;
export const PARTY_EXPIRY_HOURS = 24;

// Real-Time Configuration
export const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
export const MAX_LOCATION_LATENCY_MS = 800; // Maximum acceptable latency
export const WEBSOCKET_RECONNECT_INTERVAL = 3000; // 3 seconds
export const MAX_RECONNECT_ATTEMPTS = 5;

// Map Configuration
export const DEFAULT_MAP_CENTER: [number, number] = [-0.1276, 51.5074]; // London
export const DEFAULT_MAP_ZOOM = 12;
export const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11'; // Dark theme for Stealth Mode

// Alert Thresholds (for speed camera alerts)
export const ALERT_DISTANCES = {
  FAR: 2000, // 2km
  MEDIUM: 1000, // 1km
  NEAR: 500, // 500m
  CRITICAL: 200, // 200m
};

export const SPEED_THRESHOLD = {
  LOW: 15, // km/h over limit
  MEDIUM: 30, // km/h over limit
  HIGH: 50, // km/h over limit
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'speedlink_auth_token',
  REFRESH_TOKEN: 'speedlink_refresh_token',
  USER_ID: 'speedlink_user_id',
  USER_PROFILE: 'speedlink_user_profile',
  CURRENT_PARTY: 'speedlink_current_party',
  PRIVACY_MODE: 'speedlink_privacy_mode',
  MAP_SETTINGS: 'speedlink_map_settings',
} as const;

// Vehicle Types
export const VEHICLE_TYPES = [
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'car', label: 'Car' },
  { value: 'truck', label: 'Truck' },
  { value: 'other', label: 'Other' },
] as const;

// Privacy Modes
export const PRIVACY_MODES = {
  VISIBLE: 'visible',
  HIDDEN: 'hidden',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  AUTH_FAILED: 'Authentication failed. Please log in again.',
  INVALID_PARTY_CODE: 'Invalid party code. Please check and try again.',
  PARTY_FULL: 'This party is full. Maximum members reached.',
  GEOLOCATION_DENIED: 'Location access denied. Please enable location services.',
  WEBSOCKET_ERROR: 'Real-time connection failed. Retrying...',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  MAP: '/map',
  PARTY_CREATE: '/party/create',
  PARTY_JOIN: '/party/join',
  PARTY_MANAGE: '/party/:partyId',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  NOT_FOUND: '/404',
} as const;
