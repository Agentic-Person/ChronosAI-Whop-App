/**
 * GET /api/calendar/stats
 * Get student study statistics and progress
 *
 * Feature gated: PRO tier required
 */

import { NextRequest, NextResponse } from 'next/server';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { calendarService } from '@/lib/calendar/calendar-service';
import { adaptiveScheduler } from '@/lib/calendar/adaptive-scheduler';

async function getStatsHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        {
          error: 'Missing required parameter',
          message: 'studentId is required',
        },
        { status: 400 }
      );
    }

    // Get study statistics
    const stats = await calendarService.getStudyStats(studentId);

    // Get adaptation suggestions
    const adaptation = await adaptiveScheduler.analyzeAndAdapt(studentId);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        adaptation,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching calendar stats:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      },
      { status: 500 }
    );
  }
}

// Apply feature gate
export const GET = withFeatureGate(
  {
    feature: Feature.FEATURE_LEARNING_CALENDAR,
    logAccess: false,
  },
  getStatsHandler
);
