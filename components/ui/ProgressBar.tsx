import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  color?: 'cyan' | 'green' | 'purple' | 'yellow';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  showPercentage = false,
  color = 'cyan',
  size = 'md',
  className,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  const colorClasses = {
    cyan: 'bg-gradient-primary',
    green: 'bg-gradient-success',
    purple: 'bg-gradient-purple',
    yellow: 'bg-accent-yellow',
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm text-text-secondary">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-semibold text-text-primary">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
      <div className={cn('progress-bar', sizeClasses[size])}>
        <motion.div
          className={cn('progress-bar-fill', colorClasses[color])}
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};
