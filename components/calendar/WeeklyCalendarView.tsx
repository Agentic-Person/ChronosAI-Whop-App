/**
 * Weekly Calendar View Component
 * Displays learning schedule in a weekly grid format
 */

'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, isPast, isFuture, isToday } from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface WeeklyCalendarViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onMarkComplete?: (eventId: string) => void;
}

export function WeeklyCalendarView({
  events,
  onEventClick,
  onMarkComplete,
}: WeeklyCalendarViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Start on Monday
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => isSameDay(new Date(event.scheduled_date), date));
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <h2 className="text-xl font-semibold">
            {format(currentWeekStart, 'MMM d')} -{' '}
            {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
          </h2>

          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-3">
        {weekDays.map((date, dayIndex) => {
          const dayEvents = getEventsForDay(date);
          const isTodayDate = isToday(date);

          return (
            <div
              key={dayIndex}
              className={`
                border rounded-lg p-3 min-h-[250px] transition-all
                ${isTodayDate ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200'}
              `}
            >
              {/* Day header */}
              <div className="text-center mb-3 pb-2 border-b">
                <div className="text-xs text-gray-600 uppercase font-semibold">
                  {format(date, 'EEE')}
                </div>
                <div
                  className={`
                    text-lg font-bold mt-1
                    ${isTodayDate ? 'text-blue-600' : 'text-gray-900'}
                  `}
                >
                  {format(date, 'd')}
                </div>
              </div>

              {/* Events for this day */}
              <div className="space-y-2">
                {dayEvents.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-4">No sessions</div>
                ) : (
                  dayEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick?.(event)}
                      onMarkComplete={() => onMarkComplete?.(event.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-6 pt-4 border-t flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Circle className="w-4 h-4 text-blue-500" />
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-red-500" />
            <span>Overdue</span>
          </div>
        </div>

        <div>
          {events.filter((e) => e.completed).length} / {events.length} completed this week
        </div>
      </div>
    </div>
  );
}

// Event card component
function EventCard({
  event,
  onClick,
  onMarkComplete,
}: {
  event: CalendarEvent;
  onClick: () => void;
  onMarkComplete: () => void;
}) {
  const eventDate = new Date(event.scheduled_date);
  const isOverdue = !event.completed && isPast(eventDate);
  const isUpcoming = isFuture(eventDate);

  const handleMarkComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkComplete();
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-3 rounded-md border-l-4 cursor-pointer transition-all hover:shadow-md
        ${
          event.completed
            ? 'border-green-500 bg-green-50 hover:bg-green-100'
            : isOverdue
            ? 'border-red-500 bg-red-50 hover:bg-red-100'
            : 'border-blue-500 bg-blue-50 hover:bg-blue-100'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {event.completed ? (
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          ) : isOverdue ? (
            <Clock className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Circle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-gray-900 truncate">
              {event.video?.title || 'Video'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {format(eventDate, 'h:mm a')} • {event.session_duration}m
            </div>
            {event.estimated_difficulty && (
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`
                      w-2 h-2 rounded-full
                      ${
                        i < (event.estimated_difficulty || 0)
                          ? 'bg-yellow-500'
                          : 'bg-gray-300'
                      }
                    `}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {!event.completed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkComplete}
            className="h-6 px-2 text-xs"
          >
            Done
          </Button>
        )}
      </div>
    </div>
  );
}
