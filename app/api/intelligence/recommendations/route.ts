/**
 * Content Recommendations API
 * Get personalized video recommendations
 * ENTERPRISE tier feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { RecommendationEngine } from '@/lib/intelligence/recommendation-engine';

/**
 * GET /api/intelligence/recommendations?count=5
 * Get recommended videos for authenticated student
 */
export const GET = withFeatureGate(
  { feature: Feature.FEATURE_CONTENT_INTELLIGENCE },
  async (req: NextRequest) => {
    try {
      const supabase = createClient();
      const { searchParams } = new URL(req.url);
      const count = parseInt(searchParams.get('count') || '5');

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

      // Get recommendations
      const engine = new RecommendationEngine();
      const videos = await engine.recommendNextVideos(student.id, count);

      return NextResponse.json({
        success: true,
        recommendations: videos,
        count: videos.length,
      });
    } catch (error: any) {
      console.error('Get recommendations error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get recommendations' },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/intelligence/recommendations/path
 * Generate personalized learning path
 */
export const POST = withFeatureGate(
  { feature: Feature.FEATURE_CONTENT_INTELLIGENCE },
  async (req: NextRequest) => {
    try {
      const supabase = createClient();
      const body = await req.json();
      const { goal } = body;

      if (!goal) {
        return NextResponse.json({ error: 'Goal is required' }, { status: 400 });
      }

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

      // Generate learning path
      const engine = new RecommendationEngine();
      const path = await engine.generateLearningPath(student.id, goal);

      return NextResponse.json({
        success: true,
        path,
        message: `Generated ${path?.total_weeks}-week learning path`,
      });
    } catch (error: any) {
      console.error('Generate path error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to generate learning path' },
        { status: 500 }
      );
    }
  }
);
