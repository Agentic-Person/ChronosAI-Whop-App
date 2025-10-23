'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { Card } from '@/components/ui/Card';

interface EnrollmentChartProps {
  data: Record<string, number>;
  className?: string;
}

export function EnrollmentChart({ data, className }: EnrollmentChartProps) {
  // Convert data to array format for recharts
  const chartData = Object.entries(data).map(([date, count]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    students: count,
  }));

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-elevated border border-border-default rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{payload[0].payload.date}</p>
          <p className="text-accent-cyan font-bold">
            {payload[0].value} student{payload[0].value !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card padding="lg" className={className}>
      <h3 className="text-lg font-bold mb-4">Student Enrollments Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
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
          <Line
            type="monotone"
            dataKey="students"
            stroke="hsl(var(--accent-cyan))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--accent-cyan))', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
