/**
 * PATCH /api/calendar/events/[id]
 * Update a calendar event (mark complete, reschedule, etc.)
 *
 * Feature gated: PRO tier required
 */

import { NextRequest, NextResponse } from 'next/server';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { calendarService } from '@/lib/calendar/calendar-service';
import type { UpdateCalendarEventInput } from '@/types/calendar';

async function updateEventHandler(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const body = await req.json();

    // Validate event ID
    if (!eventId) {
      return NextResponse.json(
        {
          error: 'Missing event ID',
          message: 'Event ID is required',
        },
        { status: 400 }
      );
    }

    // Handle different update types
    if (body.status === 'completed') {
      // Mark event as complete
      const event = await calendarService.markEventComplete(
        eventId,
        body.actualDuration
      );

      return NextResponse.json({
        success: true,
        message: 'Event marked as complete',
        data: { event },
      });
    }

    if (body.newScheduledDate) {
      // Reschedule event
      await calendarService.rescheduleEvent(
        eventId,
        new Date(body.newScheduledDate),
        body.cascadeChanges || false
      );

      return NextResponse.json({
        success: true,
        message: 'Event rescheduled successfully',
      });
    }

    // Generic update
    const updates: UpdateCalendarEventInput = {};

    if (body.scheduledDate) {
      updates.scheduled_date = new Date(body.scheduledDate);
    }

    if (body.sessionDuration !== undefined) {
      updates.session_duration = body.sessionDuration;
    }

    if (body.completed !== undefined) {
      updates.completed = body.completed;
    }

    const event = await calendarService.updateEvent(eventId, updates);

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully',
      data: { event },
    });
  } catch (error) {
    console.error('[API] Error updating calendar event:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update event',
      },
      { status: 500 }
    );
  }
}

async function deleteEventHandler(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;

    if (!eventId) {
      return NextResponse.json(
        {
          error: 'Missing event ID',
          message: 'Event ID is required',
        },
        { status: 400 }
      );
    }

    await calendarService.deleteEvent(eventId);

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('[API] Error deleting calendar event:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete event',
      },
      { status: 500 }
    );
  }
}

// Apply feature gate
export const PATCH = withFeatureGate(
  {
    feature: Feature.FEATURE_LEARNING_CALENDAR,
    logAccess: false,
  },
  updateEventHandler
);

export const DELETE = withFeatureGate(
  {
    feature: Feature.FEATURE_LEARNING_CALENDAR,
    logAccess: false,
  },
  deleteEventHandler
);
