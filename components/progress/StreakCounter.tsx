'use client';

import { motion } from 'framer-motion';
import { Flame, Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date;
  showCalendar?: boolean;
  className?: string;
}

interface DayActivity {
  date: Date;
  isActive: boolean;
  xpEarned?: number;
}

export function StreakCounter({
  currentStreak,
  longestStreak,
  lastActiveDate,
  showCalendar = true,
  className = '',
}: StreakCounterProps) {
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
  const isActive = daysSince <= 1;

  // Generate last 30 days for calendar
  const generateCalendarData = (): DayActivity[] => {
    const days: DayActivity[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      const isActiveDay = daysDiff < currentStreak && isActive;

      days.push({
        date,
        isActive: isActiveDay,
        xpEarned: isActiveDay ? 50 + Math.floor(Math.random() * 200) : 0,
      });
    }
    return days;
  };

  const calendarData = generateCalendarData();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Streak Display */}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white shadow-lg">
        <div className="flex items-center space-x-4">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, -10, 10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Flame size={48} fill="currentColor" />
          </motion.div>

          <div>
            <div className="flex items-baseline space-x-2">
              <motion.span
                className="text-5xl font-bold"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                {currentStreak}
              </motion.span>
              <span className="text-lg opacity-90">day{currentStreak !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-sm opacity-80">
              {isActive ? "Don't break the chain!" : 'Start a new streak today!'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm opacity-80">Longest Streak</p>
          <p className="text-3xl font-bold">{longestStreak}</p>
        </div>
      </div>

      {/* Calendar Heatmap */}
      {showCalendar && (
        <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
          <div className="mb-4 flex items-center space-x-2 text-gray-700 dark:text-gray-300">
            <Calendar size={20} />
            <h3 className="font-semibold">Last 30 Days</h3>
          </div>

          <div className="grid grid-cols-10 gap-2">
            {calendarData.map((day, index) => {
              const intensity = day.xpEarned ? Math.min(day.xpEarned / 250, 1) : 0;
              const bgColor = day.isActive
                ? `rgba(249, 115, 22, ${0.2 + intensity * 0.8})`
                : 'rgba(209, 213, 219, 0.3)';

              return (
                <motion.div
                  key={index}
                  className="group relative aspect-square cursor-pointer rounded-md transition-transform hover:scale-110"
                  style={{ backgroundColor: bgColor }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.01 }}
                >
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute -top-16 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:block group-hover:opacity-100">
                    <p className="font-semibold">{format(day.date, 'MMM d, yyyy')}</p>
                    {day.isActive && <p className="text-orange-400">{day.xpEarned} XP earned</p>}
                    {!day.isActive && <p className="text-gray-400">No activity</p>}
                    {/* Arrow */}
                    <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-end space-x-2 text-xs text-gray-600 dark:text-gray-400">
            <span>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((intensity, index) => (
              <div
                key={index}
                className="h-3 w-3 rounded-sm"
                style={{
                  backgroundColor:
                    intensity === 0
                      ? 'rgba(209, 213, 219, 0.3)'
                      : `rgba(249, 115, 22, ${0.2 + intensity * 0.8})`,
                }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  );
}
