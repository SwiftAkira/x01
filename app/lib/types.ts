// SpeedLink TypeScript Types

import type { FeatureCollection, LineString } from 'geojson'

// =============================================
// Profile Types
// =============================================
export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  location_sharing_enabled: boolean;
  visible_to_party: boolean;
  ghost_mode: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// Party Types (Epic 3)
// =============================================
export interface Party {
  id: string;
  party_code: string;
  name: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartyMember {
  id: string;
  party_id: string;
  user_id: string;
  joined_at: string;
  last_seen_at: string;
  is_online: boolean;
  // Joined profile data
  profile?: Profile;
}

export interface LocationUpdate {
  id: string;
  user_id: string;
  party_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number | null;
  created_at: string;
}

// =============================================
// Extended Types with Relations
// =============================================
export interface PartyWithMembers extends Party {
  members: PartyMember[];
  member_count?: number;
}

export interface PartyMemberWithLocation extends PartyMember {
  latest_location?: LocationUpdate;
  distance?: number; // Distance from current user in meters
}

// =============================================
// Navigation Types
// =============================================
export interface LaneInfo {
  valid: boolean;
  active: boolean;
  indications: string[];
}

export interface NavigationStep {
  id: string;
  instruction: string;
  distance: number;
  duration: number;
  name?: string | null;
  maneuverType?: string | null;
  maneuverModifier?: string | null;
  maneuverLocation: [number, number];
  geometry?: [number, number][];
  lanes?: LaneInfo[];
}

export interface PartyNavigationState {
  party_id: string | null;
  created_by: string;
  destination_name: string;
  destination_address?: string | null;
  destination_coordinates: [number, number];
  distance_meters: number;
  duration_seconds: number;
  route_geojson: FeatureCollection<LineString>;
  steps: NavigationStep[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// Form Types
// =============================================
export interface CreatePartyInput {
  name?: string;
}

export interface JoinPartyInput {
  party_code: string;
}

export interface UpdateLocationInput {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

// =============================================
// Hazard Reporting Types (Waze-style)
// =============================================
export type HazardType = 'police' | 'accident' | 'hazard' | 'traffic' | 'road_closed';
export type HazardSeverity = 'low' | 'medium' | 'high';

export interface HazardReport {
  id: string;
  party_id: string;
  reported_by: string;
  hazard_type: HazardType;
  latitude: number;
  longitude: number;
  description?: string;
  severity: HazardSeverity;
  is_active: boolean;
  upvotes: number;
  downvotes: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ArrivalNotification {
  id: string;
  party_id: string;
  user_id: string;
  destination_latitude: number;
  destination_longitude: number;
  arrived_at: string;
  notified: boolean;
  created_at: string;
}

// =============================================
// Route Options Types
// =============================================
export interface RouteOptions {
  preference: 'fastest' | 'shortest';
  avoid_highways: boolean;
  avoid_tolls: boolean;
}

// =============================================
// Response Types
// =============================================
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PartyResponse {
  party: Party;
  party_code: string;
}
