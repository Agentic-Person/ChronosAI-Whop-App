'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { getLevelInfo } from '@/lib/progress/gamification-engine';

interface LevelBadgeProps {
  totalXP: number;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export function LevelBadge({
  totalXP,
  size = 'medium',
  showProgress = true,
  showTooltip = true,
  className = '',
}: LevelBadgeProps) {
  const levelInfo = getLevelInfo(totalXP);

  const sizeMap = {
    small: {
      badge: 'w-12 h-12',
      text: 'text-lg',
      icon: 16,
      progressHeight: 'h-1',
    },
    medium: {
      badge: 'w-16 h-16',
      text: 'text-2xl',
      icon: 20,
      progressHeight: 'h-2',
    },
    large: {
      badge: 'w-24 h-24',
      text: 'text-4xl',
      icon: 28,
      progressHeight: 'h-3',
    },
  };

  const sizeConfig = sizeMap[size];

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      {/* Level Badge */}
      <motion.div
        className={`${sizeConfig.badge} relative flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 opacity-50 blur-md" />

        {/* Level number */}
        <span className={`${sizeConfig.text} relative z-10 font-bold text-white`}>
          {levelInfo.level}
        </span>

        {/* Sparkle icon */}
        <Zap
          size={sizeConfig.icon}
          className="absolute -right-1 -top-1 text-yellow-400"
          fill="currentColor"
        />

        {/* Tooltip */}
        {showTooltip && (
          <div className="pointer-events-none absolute -bottom-16 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 shadow-xl transition-opacity group-hover:block group-hover:opacity-100">
            <div className="space-y-1">
              <p className="font-semibold">Level {levelInfo.level}</p>
              <p className="text-xs text-gray-300">
                {levelInfo.currentXP.toLocaleString()} / {levelInfo.xpForNextLevel.toLocaleString()}{' '}
                XP
              </p>
              <p className="text-xs text-gray-400">
                {(levelInfo.xpForNextLevel - levelInfo.currentXP).toLocaleString()} XP to next level
              </p>
            </div>
            {/* Arrow */}
            <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900" />
          </div>
        )}
      </motion.div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="w-full max-w-xs space-y-1">
          <div className={`overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${sizeConfig.progressHeight}`}>
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${levelInfo.progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>

          {/* XP Text */}
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{levelInfo.currentXP.toLocaleString()} XP</span>
            <span>{levelInfo.xpForNextLevel.toLocaleString()} XP</span>
          </div>
        </div>
      )}
    </div>
  );
}
