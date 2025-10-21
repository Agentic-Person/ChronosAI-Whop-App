/**
 * POST /api/calendar/generate
 * Generate personalized learning calendar for a student
 *
 * Feature gated: PRO tier required
 */

import { NextRequest, NextResponse } from 'next/server';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { CalendarGenerator } from '@/lib/calendar/calendar-generator';
import type { OnboardingData } from '@/types/onboarding';

async function generateCalendarHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, creatorId, onboardingData } = body;

    // Validate input
    if (!studentId || !creatorId || !onboardingData) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'studentId, creatorId, and onboardingData are required',
        },
        { status: 400 }
      );
    }

    // Validate onboarding data structure
    if (!onboardingData.availableHoursPerWeek || !onboardingData.targetCompletionWeeks) {
      return NextResponse.json(
        {
          error: 'Invalid onboarding data',
          message: 'availableHoursPerWeek and targetCompletionWeeks are required',
        },
        { status: 400 }
      );
    }

    // Generate calendar using AI
    const generator = new CalendarGenerator();
    const events = await generator.generate(
      studentId,
      creatorId,
      onboardingData as OnboardingData
    );

    // Calculate summary statistics
    const totalDuration = events.reduce((sum, e) => sum + e.session_duration, 0);
    const startDate = events.length > 0 ? new Date(events[0].scheduled_date) : new Date();
    const endDate = events.length > 0
      ? new Date(events[events.length - 1].scheduled_date)
      : new Date();

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${events.length} learning sessions`,
      data: {
        events,
        totalEvents: events.length,
        totalDuration,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error('[API] Calendar generation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Calendar generation failed',
        message: 'Failed to generate learning calendar',
      },
      { status: 500 }
    );
  }
}

// Apply feature gate to protect the route
export const POST = withFeatureGate(
  {
    feature: Feature.FEATURE_LEARNING_CALENDAR,
    logAccess: true,
  },
  generateCalendarHandler
);
