/**
 * Content Health API
 * Get content health metrics and recommendations
 * ENTERPRISE tier feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { ContentHealthMonitor } from '@/lib/intelligence/content-health';

/**
 * GET /api/intelligence/health?videoId=xxx
 * Get health metrics for a specific video
 */
export const GET = withFeatureGate(
  { feature: Feature.FEATURE_CONTENT_INTELLIGENCE },
  async (req: NextRequest) => {
    try {
      const supabase = createClient();
      const { searchParams } = new URL(req.url);
      const videoId = searchParams.get('videoId');

      if (!videoId) {
        return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Verify creator owns this video
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creator) {
        return NextResponse.json({ error: 'Creator access required' }, { status: 403 });
      }

      const { data: video } = await supabase
        .from('videos')
        .select('id')
        .eq('id', videoId)
        .eq('creator_id', creator.id)
        .single();

      if (!video) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }

      // Get health metrics
      const monitor = new ContentHealthMonitor();
      const health = await monitor.analyzeContentEffectiveness(videoId);

      return NextResponse.json({
        success: true,
        health,
      });
    } catch (error: any) {
      console.error('Get content health error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get content health' },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/intelligence/health/gaps
 * Find content gaps in curriculum
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

      // Find content gaps
      const monitor = new ContentHealthMonitor();
      const gaps = await monitor.findContentGaps(creator.id);

      return NextResponse.json({
        success: true,
        gaps,
        count: gaps.length,
      });
    } catch (error: any) {
      console.error('Find content gaps error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to find content gaps' },
        { status: 500 }
      );
    }
  }
);
