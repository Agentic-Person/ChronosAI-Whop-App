/**
 * Knowledge Gaps API
 * Get and detect knowledge gaps for students
 * ENTERPRISE tier feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { GapDetector } from '@/lib/intelligence/gap-detector';

/**
 * GET /api/intelligence/gaps
 * Get knowledge gaps for authenticated student
 */
export const GET = withFeatureGate(
  { feature: Feature.FEATURE_CONTENT_INTELLIGENCE },
  async (req: NextRequest) => {
    try {
      const supabase = createClient();

      // Get authenticated user
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
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      // Get stored gaps
      const { data: gaps, error } = await supabase
        .from('knowledge_gaps')
        .select('*')
        .eq('student_id', student.id)
        .eq('status', 'open')
        .order('severity', { ascending: true });

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        gaps: gaps || [],
      });
    } catch (error: any) {
      console.error('Get gaps error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get knowledge gaps' },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/intelligence/gaps
 * Trigger gap detection for authenticated student
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

      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      // Run gap detection
      const detector = new GapDetector();
      const gaps = await detector.detectGaps(student.id);

      return NextResponse.json({
        success: true,
        gaps,
        message: `Detected ${gaps.length} knowledge gaps`,
      });
    } catch (error: any) {
      console.error('Detect gaps error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to detect knowledge gaps' },
        { status: 500 }
      );
    }
  }
);
