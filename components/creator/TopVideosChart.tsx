'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/Card';

interface TopVideo {
  id: string;
  title: string;
  views: number;
  completions: number;
  completionRate: number;
}

interface TopVideosChartProps {
  videos: TopVideo[];
  className?: string;
}

export function TopVideosChart({ videos, className }: TopVideosChartProps) {
  // Truncate long titles for chart display
  const chartData = videos.map((video) => ({
    ...video,
    shortTitle: video.title.length > 30 ? video.title.substring(0, 30) + '...' : video.title,
  }));

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const video = payload[0].payload;
      return (
        <div className="bg-bg-elevated border border-border-default rounded-lg p-3 shadow-lg max-w-xs">
          <p className="text-sm font-medium mb-2">{video.title}</p>
          <div className="space-y-1 text-sm">
            <p className="text-accent-cyan">
              <span className="font-bold">{video.views}</span> views
            </p>
            <p className="text-accent-green">
              <span className="font-bold">{video.completions}</span> completions
            </p>
            <p className="text-text-muted">
              Completion rate: <span className="font-bold">{video.completionRate}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const getBarColor = (completionRate: number) => {
    if (completionRate >= 75) return 'hsl(var(--accent-green))';
    if (completionRate >= 50) return 'hsl(var(--accent-yellow))';
    return 'hsl(var(--accent-orange))';
  };

  return (
    <Card padding="lg" className={className}>
      <h3 className="text-lg font-bold mb-4">Top Videos by Views</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 120, right: 20, top: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
          <XAxis
            type="number"
            stroke="hsl(var(--text-muted))"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            type="category"
            dataKey="shortTitle"
            stroke="hsl(var(--text-muted))"
            style={{ fontSize: '11px' }}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="views" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.completionRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-accent-green"></div>
          <span className="text-text-muted">75%+ completion</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-accent-yellow"></div>
          <span className="text-text-muted">50-74% completion</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-accent-orange"></div>
          <span className="text-text-muted">&lt;50% completion</span>
        </div>
      </div>
    </Card>
  );
}
