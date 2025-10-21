/**
 * Upcoming Events Widget
 * Displays next upcoming calendar events on dashboard
 */

'use client';

import { format } from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, PlayCircle } from 'lucide-react';

interface UpcomingEventsProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onStartLearning?: (event: CalendarEvent) => void;
}

export function UpcomingEvents({ events, onEventClick, onStartLearning }: UpcomingEventsProps) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Sessions
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No upcoming sessions scheduled</p>
          <p className="text-sm mt-1">Your next learning sessions will appear here</p>
        </div>
      </div>
    );
  }

  const nextEvent = events[0];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Upcoming Sessions
      </h3>

      {/* Next up - highlighted */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 border-2 border-blue-200">
        <div className="text-xs text-blue-600 font-semibold uppercase mb-1">Next Up</div>
        <h4 className="font-semibold text-gray-900 mb-2">{nextEvent.video?.title}</h4>
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {format(new Date(nextEvent.scheduled_date), 'EEE, MMM d • h:mm a')}
          </div>
          <div>{nextEvent.session_duration} minutes</div>
        </div>
        <Button
          onClick={() => onStartLearning?.(nextEvent)}
          className="w-full flex items-center justify-center gap-2"
        >
          <PlayCircle className="w-4 h-4" />
          Start Learning
        </Button>
      </div>

      {/* Other upcoming events */}
      <div className="space-y-2">
        {events.slice(1, 5).map((event) => (
          <div
            key={event.id}
            onClick={() => onEventClick?.(event)}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">
                {event.video?.title}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {format(new Date(event.scheduled_date), 'MMM d, h:mm a')} • {event.session_duration}m
              </div>
            </div>
            {event.estimated_difficulty && (
              <div className="flex items-center gap-0.5 ml-2">
                {Array.from({ length: event.estimated_difficulty }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {events.length > 5 && (
        <div className="mt-4 pt-4 border-t text-center">
          <Button variant="ghost" size="sm">
            View all {events.length} sessions
          </Button>
        </div>
      )}
    </div>
  );
}
