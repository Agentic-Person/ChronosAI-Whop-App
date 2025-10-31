'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatCost } from '@/lib/usage/pricing-config';
import { cn } from '@/lib/utils';

export interface CostMeterProps {
  label: string;
  current: number;
  limit: number;
  period: 'daily' | 'monthly';
  status: 'good' | 'warning' | 'critical' | 'exceeded';
  className?: string;
}

/**
 * CostMeter Component
 *
 * Visual gauge showing current spend vs budget limit with status indicator
 */
export const CostMeter: React.FC<CostMeterProps> = ({
  label,
  current,
  limit,
  period,
  status,
  className,
}) => {
  // Calculate percentage
  const percentage = Math.min((current / limit) * 100, 100);

  // Get color based on status
  const statusConfig = {
    good: {
      color: 'bg-accent-green',
      borderColor: 'border-accent-green/40',
      bgColor: 'from-accent-green/15 to-accent-green/5',
      textColor: 'text-accent-green',
      icon: DollarSign,
      message: 'Within budget',
    },
    warning: {
      color: 'bg-accent-yellow',
      borderColor: 'border-accent-yellow/40',
      bgColor: 'from-accent-yellow/15 to-accent-yellow/5',
      textColor: 'text-accent-yellow',
      icon: TrendingUp,
      message: 'Approaching limit',
    },
    critical: {
      color: 'bg-accent-orange',
      borderColor: 'border-accent-orange/40',
      bgColor: 'from-accent-orange/15 to-accent-orange/5',
      textColor: 'text-accent-orange',
      icon: AlertTriangle,
      message: 'Near limit',
    },
    exceeded: {
      color: 'bg-red-500',
      borderColor: 'border-red-500/40',
      bgColor: 'from-red-500/15 to-red-500/5',
      textColor: 'text-red-500',
      icon: XCircle,
      message: 'Limit exceeded',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Calculate remaining budget
  const remaining = Math.max(limit - current, 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card
        padding="lg"
        className={cn(
          'relative overflow-hidden border-2',
          config.borderColor,
          `bg-gradient-to-br ${config.bgColor}`
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-text-muted mb-1">{label}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{formatCost(current)}</span>
              <span className="text-sm text-text-muted">/ {formatCost(limit)}</span>
            </div>
          </div>

          {/* Status Icon */}
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              config.bgColor
            )}
          >
            <StatusIcon className={cn('w-6 h-6', config.textColor)} />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <ProgressBar
            value={percentage}
            max={100}
            barColor={config.color.replace('bg-', '')}
            className="h-2"
          />
        </div>

        {/* Status Message */}
        <div className="flex items-center justify-between">
          <span className={cn('text-sm font-medium', config.textColor)}>
            {config.message}
          </span>
          <span className="text-sm text-text-muted">
            {remaining > 0
              ? `${formatCost(remaining)} remaining`
              : 'Budget exceeded'}
          </span>
        </div>

        {/* Percentage Badge */}
        <div className="absolute top-4 right-4 opacity-10">
          <div className="text-6xl font-bold">{Math.round(percentage)}%</div>
        </div>
      </Card>
    </motion.div>
  );
};
