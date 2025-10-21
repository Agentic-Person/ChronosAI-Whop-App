/**
 * GET /api/calendar/events
 * Fetch calendar events for a student with optional filtering
 *
 * Feature gated: PRO tier required
 */

import { NextRequest, NextResponse } from 'next/server';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { calendarService } from '@/lib/calendar/calendar-service';
import type { CalendarEventFilters } from '@/types/calendar';

async function getEventsHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract query parameters
    const studentId = searchParams.get('studentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const completed = searchParams.get('completed');
    const videoId = searchParams.get('videoId');
    const upcoming = searchParams.get('upcoming') === 'true';
    const limit = searchParams.get('limit');

    if (!studentId) {
      return NextResponse.json(
        {
          error: 'Missing required parameter',
          message: 'studentId is required',
        },
        { status: 400 }
      );
    }

    // Handle upcoming events shortcut
    if (upcoming) {
      const upcomingLimit = limit ? parseInt(limit, 10) : 5;
      const events = await calendarService.getUpcomingEvents(studentId, upcomingLimit);

      return NextResponse.json({
        success: true,
        data: {
          events,
          totalCount: events.length,
        },
      });
    }

    // Build filters
    const filters: CalendarEventFilters = {
      studentId,
    };

    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    if (completed !== null && completed !== undefined) {
      filters.completed = completed === 'true';
    }

    if (videoId) {
      filters.videoId = videoId;
    }

    // Fetch events
    const events = await calendarService.getEventsByDateRange(filters);

    return NextResponse.json({
      success: true,
      data: {
        events,
        totalCount: events.length,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching calendar events:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch events',
      },
      { status: 500 }
    );
  }
}

// Apply feature gate
export const GET = withFeatureGate(
  {
    feature: Feature.FEATURE_LEARNING_CALENDAR,
    logAccess: false, // Don't log every read
  },
  getEventsHandler
);
