'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, className }: StatsCardProps) {
  const isPositiveTrend = trend && trend.value > 0;
  const isNegativeTrend = trend && trend.value < 0;

  return (
    <Card padding="lg" className={cn('bg-bg-card border border-border-default', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-text-muted text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold mb-2">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 text-sm">
              {isPositiveTrend && <TrendingUp className="w-4 h-4 text-accent-green" />}
              {isNegativeTrend && <TrendingDown className="w-4 h-4 text-accent-red" />}
              <span
                className={cn(
                  'font-medium',
                  isPositiveTrend && 'text-accent-green',
                  isNegativeTrend && 'text-accent-red',
                  !isPositiveTrend && !isNegativeTrend && 'text-text-muted'
                )}
              >
                {isPositiveTrend && '+'}
                {trend.value}%
              </span>
              <span className="text-text-muted">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-accent-cyan/10 rounded-lg">
          <Icon className="w-6 h-6 text-accent-cyan" />
        </div>
      </div>
    </Card>
  );
}
