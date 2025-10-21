/**
 * Engagement Analytics API
 * Get engagement scores and predictions
 * ENTERPRISE tier feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { EngagementAnalytics } from '@/lib/intelligence/engagement-analytics';

/**
 * GET /api/intelligence/engagement?studentId=xxx
 * Get engagement score for a student
 */
export const GET = withFeatureGate(
  { feature: Feature.FEATURE_CONTENT_INTELLIGENCE },
  async (req: NextRequest) => {
    try {
      const supabase = createClient();
      const { searchParams } = new URL(req.url);
      const studentIdParam = searchParams.get('studentId');

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      let studentId: string;

      if (studentIdParam) {
        // Creator viewing student engagement
        const { data: creator } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!creator) {
          return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
        }

        // Verify student belongs to creator
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('id', studentIdParam)
          .eq('creator_id', creator.id)
          .single();

        if (!student) {
          return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        studentId = studentIdParam;
      } else {
        // Student viewing own engagement
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!student) {
          return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        studentId = student.id;
      }

      // Calculate engagement
      const analytics = new EngagementAnalytics();
      const engagement = await analytics.predictEngagement(studentId);

      return NextResponse.json({
        success: true,
        engagement,
      });
    } catch (error: any) {
      console.error('Get engagement error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get engagement score' },
        { status: 500 }
      );
    }
  }
);

/**
 * GET /api/intelligence/engagement/at-risk
 * Get list of at-risk students (creator only)
 */
export const POST = withFeatureGate(
  { feature: Feature.FEATURE_CONTENT_INTELLIGENCE },
  async (req: NextRequest) => {
    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creator) {
        return NextResponse.json({ error: 'Creator access required' }, { status: 403 });
      }

      // Get at-risk students
      const analytics = new EngagementAnalytics();
      const atRiskStudents = await analytics.identifyAtRiskStudents(creator.id);

      return NextResponse.json({
        success: true,
        students: atRiskStudents,
        count: atRiskStudents.length,
      });
    } catch (error: any) {
      console.error('Get at-risk students error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to identify at-risk students' },
        { status: 500 }
      );
    }
  }
);
