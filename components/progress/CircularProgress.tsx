'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  label?: string;
  className?: string;
}

export function CircularProgress({
  percentage,
  size = 120,
  strokeWidth = 8,
  showPercentage = true,
  label,
  className = '',
}: CircularProgressProps) {
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (displayPercentage / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayPercentage(percentage);
    }, 100);

    return () => clearTimeout(timer);
  }, [percentage]);

  // Color based on percentage
  const getColor = (pct: number) => {
    if (pct < 30) return '#EF4444'; // Red
    if (pct < 60) return '#F59E0B'; // Orange
    if (pct < 90) return '#10B981'; // Green
    return '#8B5CF6'; // Purple for 90+
  };

  const color = getColor(displayPercentage);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="rotate-[-90deg]" width={size} height={size}>
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />

        {/* Progress circle */}
        <motion.circle
          strokeWidth={strokeWidth}
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            strokeLinecap: 'round',
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: 1,
            ease: 'easeOut',
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <motion.span
            className="text-2xl font-bold"
            style={{ color }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Math.round(displayPercentage)}%
          </motion.span>
        )}
        {label && (
          <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
        )}
      </div>
    </div>
  );
}
