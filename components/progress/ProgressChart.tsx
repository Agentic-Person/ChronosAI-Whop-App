'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

interface ChartDataPoint {
  date: string;
  xp: number;
  cumulativeXP: number;
}

interface ProgressChartProps {
  data: ChartDataPoint[];
  className?: string;
}

type TimeFilter = '7d' | '30d' | 'all';

export function ProgressChart({ data, className = '' }: ProgressChartProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');

  // Filter data based on selected time range
  const getFilteredData = (): ChartDataPoint[] => {
    const now = new Date();
    let cutoffDate: Date;

    switch (timeFilter) {
      case '7d':
        cutoffDate = subDays(now, 7);
        break;
      case '30d':
        cutoffDate = subDays(now, 30);
        break;
      case 'all':
        return data;
      default:
        cutoffDate = subDays(now, 30);
    }

    return data.filter((d) => new Date(d.date) >= cutoffDate);
  };

  const filteredData = getFilteredData();

  // Calculate stats
  const totalXP = filteredData.reduce((sum, d) => sum + d.xp, 0);
  const avgDailyXP = filteredData.length > 0 ? Math.round(totalXP / filteredData.length) : 0;
  const maxDailyXP = Math.max(...filteredData.map((d) => d.xp), 0);

  return (
    <div className={`rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800 ${className}`}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">XP Progress</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track your learning journey over time
          </p>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex space-x-2">
          {(['7d', '30d', 'all'] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                timeFilter === filter
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {filter === '7d' && '7 Days'}
              {filter === '30d' && '30 Days'}
              {filter === 'all' && 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-4 dark:from-blue-900/30 dark:to-blue-800/30">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total XP</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalXP.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-green-50 to-green-100 p-4 dark:from-green-900/30 dark:to-green-800/30">
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg Daily XP</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {avgDailyXP.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-4 dark:from-purple-900/30 dark:to-purple-800/30">
          <p className="text-sm text-gray-600 dark:text-gray-400">Best Day</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {maxDailyXP.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="colorXP" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />

            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'MMM d')}
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />

            <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      <p className="mb-2 font-semibold text-gray-900 dark:text-white">
                        {format(new Date(payload[0].payload.date), 'MMM d, yyyy')}
                      </p>
                      <div className="space-y-1 text-sm">
                        <p className="text-blue-600 dark:text-blue-400">
                          Daily XP: {payload[0].value?.toLocaleString()}
                        </p>
                        <p className="text-purple-600 dark:text-purple-400">
                          Total XP: {payload[1].value?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="xp"
              stroke="#3B82F6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorXP)"
              name="Daily XP"
            />

            <Area
              type="monotone"
              dataKey="cumulativeXP"
              stroke="#8B5CF6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCumulative)"
              name="Total XP"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
