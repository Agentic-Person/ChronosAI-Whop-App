'use client';

import { motion } from 'framer-motion';
import { format, startOfYear, eachDayOfInterval, isSameDay } from 'date-fns';

interface ActivityData {
  date: Date;
  xp: number;
  activitiesCompleted: number;
}

interface HeatMapProps {
  activityData: ActivityData[];
  year?: number;
  className?: string;
}

export function HeatMap({ activityData, year = new Date().getFullYear(), className = '' }: HeatMapProps) {
  const startDate = startOfYear(new Date(year, 0, 1));
  const endDate = new Date(year, 11, 31);

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Group days by week
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  allDays.forEach((day, index) => {
    currentWeek.push(day);
    if (day.getDay() === 6 || index === allDays.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Get XP for a specific date
  const getXPForDate = (date: Date): number => {
    const activity = activityData.find((a) => isSameDay(a.date, date));
    return activity?.xp || 0;
  };

  // Get activity count for a date
  const getActivityCountForDate = (date: Date): number => {
    const activity = activityData.find((a) => isSameDay(a.date, date));
    return activity?.activitiesCompleted || 0;
  };

  // Get color intensity based on XP
  const getColorIntensity = (xp: number): string => {
    if (xp === 0) return 'bg-gray-200 dark:bg-gray-700';
    if (xp < 50) return 'bg-green-200 dark:bg-green-900';
    if (xp < 100) return 'bg-green-300 dark:bg-green-800';
    if (xp < 200) return 'bg-green-400 dark:bg-green-700';
    if (xp < 500) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  };

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return (
    <div className={`rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Activity in {year}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total XP: {activityData.reduce((sum, a) => sum + a.xp, 0).toLocaleString()}
        </p>
      </div>

      <div className="overflow-x-auto">
        {/* Month labels */}
        <div className="mb-2 flex space-x-1 text-xs text-gray-600 dark:text-gray-400">
          {months.map((month, index) => (
            <div key={month} className="w-14 text-center">
              {month}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="flex space-x-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col space-y-1">
              {/* Fill empty days at start of first week */}
              {weekIndex === 0 &&
                week[0].getDay() !== 0 &&
                [...Array(week[0].getDay())].map((_, i) => (
                  <div key={`empty-${i}`} className="h-3 w-3" />
                ))}

              {week.map((day, dayIndex) => {
                const xp = getXPForDate(day);
                const activityCount = getActivityCountForDate(day);
                const colorClass = getColorIntensity(xp);

                return (
                  <motion.div
                    key={dayIndex}
                    className={`group relative h-3 w-3 cursor-pointer rounded-sm transition-all hover:ring-2 hover:ring-blue-500 ${colorClass}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: (weekIndex * 7 + dayIndex) * 0.001,
                      duration: 0.2,
                    }}
                    whileHover={{ scale: 1.5, zIndex: 10 }}
                  >
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:block group-hover:opacity-100">
                      <p className="font-semibold">{format(day, 'MMM d, yyyy')}</p>
                      <p className="text-green-400">{xp} XP earned</p>
                      {activityCount > 0 && (
                        <p className="text-gray-300">
                          {activityCount} activit{activityCount !== 1 ? 'ies' : 'y'}
                        </p>
                      )}
                      {xp === 0 && <p className="text-gray-400">No activity</p>}
                      {/* Arrow */}
                      <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-end space-x-2 text-xs text-gray-600 dark:text-gray-400">
          <span>Less</span>
          <div className="h-3 w-3 rounded-sm bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-3 rounded-sm bg-green-200 dark:bg-green-900" />
          <div className="h-3 w-3 rounded-sm bg-green-300 dark:bg-green-800" />
          <div className="h-3 w-3 rounded-sm bg-green-400 dark:bg-green-700" />
          <div className="h-3 w-3 rounded-sm bg-green-500 dark:bg-green-600" />
          <div className="h-3 w-3 rounded-sm bg-green-600 dark:bg-green-500" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
