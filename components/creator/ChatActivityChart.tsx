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
} from 'recharts';
import { Card } from '@/components/ui/Card';

interface ChatActivityChartProps {
  data: Record<string, number>;
  className?: string;
}

export function ChatActivityChart({ data, className }: ChatActivityChartProps) {
  // Convert data to array format for recharts
  const chartData = Object.entries(data).map(([date, count]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    messages: count,
  }));

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-elevated border border-border-default rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{payload[0].payload.date}</p>
          <p className="text-accent-purple font-bold">
            {payload[0].value} message{payload[0].value !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card padding="lg" className={className}>
      <h3 className="text-lg font-bold mb-4">Chat Activity Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--text-muted))"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="hsl(var(--text-muted))"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="messages"
            fill="hsl(var(--accent-purple))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
