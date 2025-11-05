// Hazard Reporting Service
// Waze-style hazard reporting functionality

import { createClient } from '@/lib/supabase/client';
import type { ApiResponse } from '@/lib/types';

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

export interface CreateHazardInput {
  party_id: string;
  hazard_type: HazardType;
  latitude: number;
  longitude: number;
  description?: string;
  severity?: HazardSeverity;
}

/**
 * Report a hazard (police, accident, etc.)
 */
export async function reportHazard(
  input: CreateHazardInput
): Promise<ApiResponse<HazardReport>> {
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data: hazard, error: hazardError } = await supabase
      .from('hazard_reports')
      .insert({
        party_id: input.party_id,
        reported_by: user.id,
        hazard_type: input.hazard_type,
        latitude: input.latitude,
        longitude: input.longitude,
        description: input.description,
        severity: input.severity || 'medium',
        is_active: true,
      })
      .select()
      .single();

    if (hazardError || !hazard) {
      return { data: null, error: hazardError?.message || 'Failed to report hazard' };
    }

    return { data: hazard as HazardReport, error: null };
  } catch (error) {
    console.error('Error reporting hazard:', error);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Get active hazards for a party
 */
export async function getPartyHazards(
  partyId: string
): Promise<ApiResponse<HazardReport[]>> {
  const supabase = createClient();

  try {
    const { data: hazards, error } = await supabase
      .from('hazard_reports')
      .select('*')
      .eq('party_id', partyId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (hazards as HazardReport[]) || [], error: null };
  } catch (error) {
    console.error('Error fetching hazards:', error);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Vote on a hazard (upvote/downvote)
 */
export async function voteHazard(
  hazardId: string,
  isUpvote: boolean
): Promise<ApiResponse<void>> {
  const supabase = createClient();

  try {
    const { data: hazard, error: fetchError } = await supabase
      .from('hazard_reports')
      .select('upvotes, downvotes')
      .eq('id', hazardId)
      .single();

    if (fetchError || !hazard) {
      return { data: null, error: 'Hazard not found' };
    }

    const updates = isUpvote
      ? { upvotes: hazard.upvotes + 1 }
      : { downvotes: hazard.downvotes + 1 };

    const { error: updateError } = await supabase
      .from('hazard_reports')
      .update(updates)
      .eq('id', hazardId);

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    return { data: null, error: null };
  } catch (error) {
    console.error('Error voting on hazard:', error);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a hazard report
 */
export async function deleteHazard(hazardId: string): Promise<ApiResponse<void>> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('hazard_reports')
      .update({ is_active: false })
      .eq('id', hazardId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null };
  } catch (error) {
    console.error('Error deleting hazard:', error);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Record arrival at destination
 */
export async function recordArrival(
  partyId: string,
  destinationLat: number,
  destinationLng: number
): Promise<ApiResponse<void>> {
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { error } = await supabase.from('arrival_notifications').insert({
      party_id: partyId,
      user_id: user.id,
      destination_latitude: destinationLat,
      destination_longitude: destinationLng,
      notified: false,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null };
  } catch (error) {
    console.error('Error recording arrival:', error);
    return { data: null, error: 'An unexpected error occurred' };
  }
}
