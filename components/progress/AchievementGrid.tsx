'use client';

import { motion } from 'framer-motion';
import { Lock, Trophy, Star, Crown, Award, Zap, Flame, Users, Eye, Rocket, GraduationCap, HandHeart, Sunrise, Moon, Medal, Infinity, Clock, Play } from 'lucide-react';
import { Achievement, AchievementRarity, StudentAchievement } from '@/lib/progress/achievement-system';

interface AchievementGridProps {
  achievements: Achievement[];
  studentAchievements: StudentAchievement[];
  onAchievementClick?: (achievement: Achievement) => void;
  className?: string;
}

const ICON_MAP: Record<string, any> = {
  Trophy,
  Star,
  Crown,
  Award,
  Zap,
  Flame,
  Users,
  Eye,
  Rocket,
  GraduationCap,
  HandHeart,
  Sunrise,
  Moon,
  Medal,
  Infinity,
  Clock,
  Play,
};

const RARITY_STYLES: Record<AchievementRarity, { bg: string; border: string; glow: string; text: string }> = {
  [AchievementRarity.COMMON]: {
    bg: 'from-gray-400 to-gray-500',
    border: 'border-gray-400',
    glow: 'shadow-gray-400/50',
    text: 'text-gray-700',
  },
  [AchievementRarity.RARE]: {
    bg: 'from-blue-400 to-blue-600',
    border: 'border-blue-400',
    glow: 'shadow-blue-400/50',
    text: 'text-blue-700',
  },
  [AchievementRarity.EPIC]: {
    bg: 'from-purple-400 to-purple-600',
    border: 'border-purple-400',
    glow: 'shadow-purple-400/50',
    text: 'text-purple-700',
  },
  [AchievementRarity.LEGENDARY]: {
    bg: 'from-yellow-400 to-orange-500',
    border: 'border-yellow-400',
    glow: 'shadow-yellow-400/50',
    text: 'text-yellow-700',
  },
};

export function AchievementGrid({
  achievements,
  studentAchievements,
  onAchievementClick,
  className = '',
}: AchievementGridProps) {
  const unlockedIds = new Set(studentAchievements.map((sa) => sa.achievement_id));

  const isUnlocked = (achievementId: string): boolean => {
    return unlockedIds.has(achievementId);
  };

  const getUnlockedDate = (achievementId: string): Date | undefined => {
    const studentAchievement = studentAchievements.find((sa) => sa.achievement_id === achievementId);
    return studentAchievement?.unlocked_at;
  };

  return (
    <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {achievements.map((achievement, index) => {
        const unlocked = isUnlocked(achievement.id);
        const unlockedDate = getUnlockedDate(achievement.id);
        const Icon = ICON_MAP[achievement.icon] || Trophy;
        const rarityStyle = RARITY_STYLES[achievement.rarity];

        return (
          <motion.div
            key={achievement.id}
            className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 p-4 transition-all hover:scale-105 ${
              unlocked
                ? `${rarityStyle.border} bg-gradient-to-br ${rarityStyle.bg} shadow-lg ${rarityStyle.glow}`
                : 'border-gray-300 bg-gray-100 opacity-60 dark:border-gray-700 dark:bg-gray-800'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            onClick={() => onAchievementClick?.(achievement)}
          >
            {/* Locked Overlay */}
            {!unlocked && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                <Lock size={32} className="text-gray-400" />
              </div>
            )}

            {/* Shine Effect for Unlocked */}
            {unlocked && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: 'linear',
                }}
              />
            )}

            {/* Content */}
            <div className="relative z-0">
              {/* Icon */}
              <div className="mb-3 flex justify-center">
                <div
                  className={`rounded-full p-3 ${
                    unlocked ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <Icon
                    size={32}
                    className={unlocked ? 'text-white' : 'text-gray-400'}
                    fill={unlocked && achievement.icon === 'Flame' ? 'currentColor' : 'none'}
                  />
                </div>
              </div>

              {/* Title */}
              <h4
                className={`text-center text-sm font-bold ${
                  unlocked ? 'text-white' : 'text-gray-700 dark:text-gray-400'
                }`}
              >
                {achievement.name}
              </h4>

              {/* Rarity Badge */}
              <div className="mt-2 flex justify-center">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium uppercase ${
                    unlocked
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {achievement.rarity}
                </span>
              </div>

              {/* XP Reward */}
              <div className="mt-2 flex items-center justify-center space-x-1 text-xs">
                <Zap
                  size={14}
                  className={unlocked ? 'text-yellow-300' : 'text-gray-400'}
                  fill="currentColor"
                />
                <span className={unlocked ? 'font-semibold text-white' : 'text-gray-600 dark:text-gray-400'}>
                  +{achievement.xp_reward} XP
                </span>
              </div>
            </div>

            {/* Tooltip */}
            <div className="pointer-events-none absolute -top-24 left-1/2 z-20 hidden w-64 -translate-x-1/2 opacity-0 transition-opacity group-hover:block group-hover:opacity-100">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-2 flex items-center justify-between">
                  <h5 className="font-bold text-gray-900 dark:text-white">{achievement.name}</h5>
                  <span className={`text-xs font-medium uppercase ${rarityStyle.text}`}>
                    {achievement.rarity}
                  </span>
                </div>

                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  {achievement.description}
                </p>

                {unlocked && unlockedDate && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Unlocked on {new Date(unlockedDate).toLocaleDateString()}
                  </p>
                )}

                {!unlocked && (
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    <p>Unlock criteria:</p>
                    <p className="mt-1 font-mono">
                      {achievement.unlock_criteria.type}: {achievement.unlock_criteria.threshold}{' '}
                      {achievement.unlock_criteria.metric.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}

                {/* Arrow */}
                <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
