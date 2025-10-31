'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatCost } from '@/lib/usage/pricing-config';
import { cn } from '@/lib/utils';

export interface UsageChartProps {
  data: Array<{
    date: string;
    cost: number;
    calls: number;
  }>;
  className?: string;
}

/**
 * UsageChart Component
 *
 * 7-day trend chart showing daily costs over time
 */
export const UsageChart: React.FC<UsageChartProps> = ({ data, className }) => {
  if (data.length === 0) {
    return (
      <Card padding="lg" className={className}>
        <h3 className="text-lg font-semibold mb-4">7-Day Spending Trend</h3>
        <div className="text-center py-12 text-text-muted">
          No usage data available yet
        </div>
      </Card>
    );
  }

  // Calculate max value for scaling
  const maxCost = Math.max(...data.map(d => d.cost));
  const minCost = Math.min(...data.map(d => d.cost));

  // Calculate trend (comparing last day to first day)
  const firstDayCost = data[0]?.cost || 0;
  const lastDayCost = data[data.length - 1]?.cost || 0;
  const trendPercentage =
    firstDayCost > 0 ? ((lastDayCost - firstDayCost) / firstDayCost) * 100 : 0;

  const isIncreasing = trendPercentage > 5;
  const isDecreasing = trendPercentage < -5;

  // Determine trend status
  const TrendIcon = isIncreasing
    ? TrendingUp
    : isDecreasing
    ? TrendingDown
    : Minus;
  const trendColor = isIncreasing
    ? 'text-accent-orange'
    : isDecreasing
    ? 'text-accent-green'
    : 'text-text-muted';

  // Calculate points for the line chart
  const chartHeight = 180;
  const chartWidth = 100; // percentage
  const padding = 20;
  const effectiveHeight = chartHeight - padding * 2;

  const points = data.map((point, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * chartWidth;
    const normalizedY =
      maxCost > 0 ? (point.cost / maxCost) * effectiveHeight : effectiveHeight / 2;
    const y = chartHeight - padding - normalizedY;
    return { x, y, ...point };
  });

  // Create SVG path
  const pathD = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x}% ${point.y}`)
    .join(' ');

  // Create area fill path
  const areaPathD = `${pathD} L ${chartWidth}% ${chartHeight - padding} L 0% ${chartHeight - padding} Z`;

  return (
    <Card padding="lg" className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">7-Day Spending Trend</h3>
        <div className={cn('flex items-center gap-2', trendColor)}>
          <TrendIcon className="w-5 h-5" />
          <span className="text-sm font-semibold">
            {Math.abs(trendPercentage).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: `${chartHeight}px` }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = padding + ratio * effectiveHeight;
            return (
              <line
                key={`grid-${index}`}
                x1="0"
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-border-default opacity-30"
              />
            );
          })}

          {/* Area fill */}
          <motion.path
            d={areaPathD}
            fill="url(#areaGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 0.5 }}
          />

          {/* Line */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-accent-cyan"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          />

          {/* Data points */}
          {points.map((point, index) => (
            <motion.g key={`point-${index}`}>
              {/* Hover area */}
              <circle
                cx={`${point.x}%`}
                cy={point.y}
                r="8"
                fill="transparent"
                className="cursor-pointer"
              >
                <title>
                  {point.date}: {formatCost(point.cost)} ({point.calls} calls)
                </title>
              </circle>

              {/* Visual point */}
              <motion.circle
                cx={`${point.x}%`}
                cy={point.y}
                r="4"
                fill="currentColor"
                className="text-accent-cyan"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              />
            </motion.g>
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" className="text-accent-cyan" />
              <stop
                offset="100%"
                stopColor="currentColor"
                className="text-accent-cyan"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-4">
        {points.map((point, index) => {
          // Only show labels for first, middle, and last points
          const isLabelPoint =
            index === 0 ||
            index === Math.floor(points.length / 2) ||
            index === points.length - 1;

          if (!isLabelPoint) return null;

          return (
            <div key={`label-${index}`} className="text-xs text-text-muted text-center">
              <div>{new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              <div className="font-semibold text-text-primary">{formatCost(point.cost)}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
