/**
 * Study Buddy Connection Service
 * Manages buddy matching, connection requests, and relationship tracking
 */

import { createClient } from '@/lib/utils/supabase-client';
import {
  StudyBuddyMatch,
  ConnectionResponse,
  ServiceResponse,
} from './types';

export class BuddyConnectionService {
  /**
   * Send a study buddy connection request
   */
  async sendConnectionRequest(
    fromStudentId: string,
    toStudentId: string,
    compatibilityScore: number,
    matchReasoning: string
  ): Promise<ConnectionResponse> {
    const supabase = createClient();

    try {
      // Check if connection already exists
      const { data: existing } = await supabase
        .from('study_buddy_matches')
        .select('*')
        .or(
          `and(student_a_id.eq.${fromStudentId},student_b_id.eq.${toStudentId}),and(student_a_id.eq.${toStudentId},student_b_id.eq.${fromStudentId})`
        )
        .single();

      if (existing) {
        throw new Error('Connection already exists');
      }

      const { data: connection, error } = await supabase
        .from('study_buddy_matches')
        .insert({
          student_a_id: fromStudentId,
          student_b_id: toStudentId,
          compatibility_score: compatibilityScore,
          match_reasoning: matchReasoning,
          status: 'suggested',
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, connection };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send connection request');
    }
  }

  /**
   * Accept a buddy connection
   */
  async acceptConnection(
    matchId: string,
    studentId: string
  ): Promise<ServiceResponse> {
    const supabase = createClient();

    try {
      const { data: match } = await supabase
        .from('study_buddy_matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (!match) throw new Error('Match not found');

      // Verify student is part of the match
      if (match.student_a_id !== studentId && match.student_b_id !== studentId) {
        throw new Error('Unauthorized');
      }

      const { error } = await supabase
        .from('study_buddy_matches')
        .update({
          status: 'connected',
          connected_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to accept connection');
    }
  }

  /**
   * Decline a buddy connection
   */
  async declineConnection(
    matchId: string,
    studentId: string
  ): Promise<ServiceResponse> {
    const supabase = createClient();

    try {
      const { data: match } = await supabase
        .from('study_buddy_matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (!match) throw new Error('Match not found');

      if (match.student_a_id !== studentId && match.student_b_id !== studentId) {
        throw new Error('Unauthorized');
      }

      const { error } = await supabase
        .from('study_buddy_matches')
        .update({ status: 'declined' })
        .eq('id', matchId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to decline connection');
    }
  }

  /**
   * Get my buddy connections
   */
  async getMyBuddies(studentId: string): Promise<StudyBuddyMatch[]> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('study_buddy_matches')
        .select(`
          *,
          student_a:students!study_buddy_matches_student_a_id_fkey(id, name, avatar_url, level),
          student_b:students!study_buddy_matches_student_b_id_fkey(id, name, avatar_url, level)
        `)
        .or(`student_a_id.eq.${studentId},student_b_id.eq.${studentId}`)
        .eq('status', 'connected')
        .order('connected_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch buddies');
    }
  }

  /**
   * Get pending connection requests
   */
  async getPendingRequests(studentId: string): Promise<StudyBuddyMatch[]> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('study_buddy_matches')
        .select(`
          *,
          student_a:students!study_buddy_matches_student_a_id_fkey(id, name, avatar_url, level),
          student_b:students!study_buddy_matches_student_b_id_fkey(id, name, avatar_url, level)
        `)
        .or(`student_a_id.eq.${studentId},student_b_id.eq.${studentId}`)
        .eq('status', 'suggested')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch pending requests');
    }
  }
}

export const buddyConnectionService = new BuddyConnectionService();
