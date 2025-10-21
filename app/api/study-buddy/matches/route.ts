/**
 * Study Buddy Matching API
 * ENTERPRISE tier feature - AI-powered study buddy matching
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase-client';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { matchingAlgorithm } from '@/lib/study-buddy/matching-algorithm';

/**
 * GET /api/study-buddy/matches
 * Find compatible study buddies for the current student
 */
export const GET = withFeatureGate(
  { feature: Feature.FEATURE_AI_STUDY_BUDDY },
  async (request: NextRequest) => {
    try {
      const supabase = createClient();

      // Get current student
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get student ID
      const { data: student } = await supabase
        .from('students')
        .select('id, matching_preferences (*)')
        .eq('user_id', user.id)
        .single();

      if (!student) {
        return NextResponse.json(
          { error: 'Student profile not found' },
          { status: 404 }
        );
      }

      if (!student.matching_preferences) {
        return NextResponse.json(
          {
            error: 'Please set up your matching preferences first',
            requiresSetup: true,
          },
          { status: 400 }
        );
      }

      // Find matches
      const matches = await matchingAlgorithm.findStudyBuddies(
        student.id,
        student.matching_preferences,
        10
      );

      return NextResponse.json({
        success: true,
        matches,
        count: matches.length,
      });
    } catch (error: any) {
      console.error('Find matches error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to find matches' },
        { status: 500 }
      );
    }
  }
);
