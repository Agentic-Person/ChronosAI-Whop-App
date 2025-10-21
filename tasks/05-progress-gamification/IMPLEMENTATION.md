# Module 5: Progress & Gamification - Implementation Guide

## Prerequisites

Before implementing gamification:
- [ ] Module 8 (Backend Infrastructure) - for API routes
- [ ] Database with students, achievements, student_achievements tables
- [ ] Framer Motion installed: `npm install framer-motion`
- [ ] React Confetti installed: `npm install react-confetti`
- [ ] Recharts installed: `npm install recharts`

## Phase 1: XP System Implementation

### Step 1.1: Create XP Service

```typescript
// lib/progress/xp-service.ts

import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import { XP_REWARDS } from '@/lib/utils/constants';

export type XPAction =
  | 'VIDEO_COMPLETED'
  | 'QUIZ_PASSED'
  | 'QUIZ_PERFECT'
  | 'PROJECT_SUBMITTED'
  | 'PROJECT_COMPLETED'
  | 'DAILY_STREAK'
  | 'WEEKLY_STREAK';

interface XPContext {
  streakDays?: number;
  score?: number;
  attemptNumber?: number;
}

export class XPService {
  /**
   * Award XP to student and handle level-up
   */
  async awardXP(
    studentId: string,
    action: XPAction,
    context?: XPContext
  ): Promise<{
    xpEarned: number;
    totalXP: number;
    leveledUp: boolean;
    newLevel?: number;
    oldLevel?: number;
  }> {
    // Calculate XP with bonuses
    const xpEarned = this.calculateXP(action, context);

    // Get current student state
    const { data: student } = await getSupabaseAdmin()
      .from('students')
      .select('xp_points, level')
      .eq('id', studentId)
      .single();

    if (!student) {
      throw new Error('Student not found');
    }

    const oldLevel = student.level;
    const newTotalXP = student.xp_points + xpEarned;

    // Check for level-up
    const { leveledUp, newLevel } = this.checkLevelUp(
      oldLevel,
      newTotalXP
    );

    // Update student
    await getSupabaseAdmin()
      .from('students')
      .update({
        xp_points: newTotalXP,
        level: leveledUp ? newLevel : oldLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId);

    // Log analytics event
    await this.logXPEvent(studentId, action, xpEarned, context);

    return {
      xpEarned,
      totalXP: newTotalXP,
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
      oldLevel: leveledUp ? oldLevel : undefined,
    };
  }

  /**
   * Calculate XP with multipliers
   */
  private calculateXP(action: XPAction, context?: XPContext): number {
    const baseXP = XP_REWARDS[action];
    let multiplier = 1.0;

    // Streak bonus
    if (context?.streakDays) {
      if (context.streakDays >= 30) multiplier += 0.5;
      else if (context.streakDays >= 14) multiplier += 0.3;
      else if (context.streakDays >= 7) multiplier += 0.15;
    }

    // Perfect score bonus
    if (context?.score === 100) {
      multiplier += 0.5;
    }

    // First try bonus
    if (context?.attemptNumber === 1) {
      multiplier += 0.25;
    }

    return Math.round(baseXP * multiplier);
  }

  /**
   * Check if student levels up
   */
  private checkLevelUp(
    currentLevel: number,
    totalXP: number
  ): { leveledUp: boolean; newLevel: number } {
    let level = currentLevel;
    let leveledUp = false;

    // Check multiple level-ups (in case of big XP gains)
    while (totalXP >= this.xpForLevel(level + 1)) {
      level++;
      leveledUp = true;
    }

    return { leveledUp, newLevel: level };
  }

  /**
   * Calculate XP needed for a level
   */
  xpForLevel(level: number): number {
    const baseXP = 100;
    const multiplier = 1.5;
    return Math.floor(baseXP * Math.pow(multiplier, level - 1));
  }

  /**
   * Get cumulative XP to reach a level
   */
  cumulativeXPForLevel(level: number): number {
    let total = 0;
    for (let i = 1; i < level; i++) {
      total += this.xpForLevel(i + 1);
    }
    return total;
  }

  /**
   * Log XP event for analytics
   */
  private async logXPEvent(
    studentId: string,
    action: XPAction,
    xpEarned: number,
    context?: XPContext
  ): Promise<void> {
    await getSupabaseAdmin()
      .from('analytics_events')
      .insert({
        student_id: studentId,
        event_type: 'xp_earned',
        event_data: {
          action,
          xpEarned,
          context,
        },
      });
  }
}

export const xpService = new XPService();
```

### Step 1.2: Create XP API Route

```typescript
// app/api/progress/xp/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { xpService } from '@/lib/progress/xp-service';
import { withRateLimit } from '@/lib/infrastructure/rate-limiting/rate-limiter';

async function handler(req: NextRequest) {
  try {
    const { studentId, action, context } = await req.json();

    if (!studentId || !action) {
      return NextResponse.json(
        { error: 'Missing studentId or action' },
        { status: 400 }
      );
    }

    const result = await xpService.awardXP(studentId, action, context);

    return NextResponse.json(result);
  } catch (error) {
    console.error('XP award error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to award XP' },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler, 'api');
```

## Phase 2: Achievement System

### Step 2.1: Create Achievement Checker

```typescript
// lib/progress/achievement-checker.ts

import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import type { Achievement } from '@/types/database';

export class AchievementChecker {
  /**
   * Check and unlock achievements for a student
   */
  async checkAchievements(
    studentId: string,
    trigger: { type: string; data?: any }
  ): Promise<Achievement[]> {
    const supabase = getSupabaseAdmin();

    // Get student data
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (!student) return [];

    // Get unlocked achievement IDs
    const { data: unlocked } = await supabase
      .from('student_achievements')
      .select('achievement_id')
      .eq('student_id', studentId);

    const unlockedIds = unlocked?.map(a => a.achievement_id) || [];

    // Get all achievements not yet unlocked
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .not('id', 'in', `(${unlockedIds.join(',') || 'null'})`);

    if (!achievements) return [];

    // Check which criteria are met
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of achievements) {
      const criteria = achievement.criteria as any;

      if (await this.meetsCriteria(studentId, criteria, trigger)) {
        newlyUnlocked.push(achievement);
      }
    }

    // Unlock achievements
    if (newlyUnlocked.length > 0) {
      await this.unlockAchievements(studentId, newlyUnlocked);
    }

    return newlyUnlocked;
  }

  /**
   * Check if criteria is met
   */
  private async meetsCriteria(
    studentId: string,
    criteria: any,
    trigger: { type: string; data?: any }
  ): Promise<boolean> {
    const supabase = getSupabaseAdmin();

    switch (criteria.type) {
      case 'video_completed':
        const { count: videoCount } = await supabase
          .from('video_progress')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('completed', true);

        return (videoCount || 0) >= (criteria.count || 1);

      case 'quiz_passed':
        const { count: quizCount } = await supabase
          .from('quiz_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('passed', true);

        return (quizCount || 0) >= (criteria.count || 1);

      case 'project_completed':
        const { count: projectCount } = await supabase
          .from('project_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('status', 'approved');

        return (projectCount || 0) >= (criteria.count || 1);

      case 'streak_days':
        const { data: student } = await supabase
          .from('students')
          .select('streak_days')
          .eq('id', studentId)
          .single();

        return (student?.streak_days || 0) >= (criteria.count || 1);

      case 'xp_earned':
        const { data: xpStudent } = await supabase
          .from('students')
          .select('xp_points')
          .eq('id', studentId)
          .single();

        return (xpStudent?.xp_points || 0) >= (criteria.count || 1000);

      default:
        return false;
    }
  }

  /**
   * Unlock achievements
   */
  private async unlockAchievements(
    studentId: string,
    achievements: Achievement[]
  ): Promise<void> {
    const supabase = getSupabaseAdmin();

    // Insert unlock records
    const records = achievements.map(achievement => ({
      student_id: studentId,
      achievement_id: achievement.id,
    }));

    await supabase
      .from('student_achievements')
      .insert(records);

    // Award XP for achievements
    const totalXP = achievements.reduce((sum, a) => sum + a.xp_value, 0);

    if (totalXP > 0) {
      await supabase.rpc('add_student_xp', {
        student_id: studentId,
        xp_amount: totalXP,
      });
    }
  }
}

export const achievementChecker = new AchievementChecker();
```

## Phase 3: Celebration Animations

### Step 3.1: XP Gain Animation

```typescript
// components/progress/XPGainAnimation.tsx

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

interface XPGain {
  id: string;
  amount: number;
  timestamp: number;
}

export function XPGainAnimation({ xpGains }: { xpGains: XPGain[] }) {
  const [visible, setVisible] = useState<XPGain[]>([]);

  useEffect(() => {
    if (xpGains.length > 0) {
      const latest = xpGains[xpGains.length - 1];
      setVisible(prev => [...prev, latest]);

      // Remove after 2 seconds
      setTimeout(() => {
        setVisible(prev => prev.filter(g => g.id !== latest.id));
      }, 2000);
    }
  }, [xpGains]);

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2">
      <AnimatePresence>
        {visible.map(gain => (
          <motion.div
            key={gain.id}
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold text-lg">{gain.amount} XP</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

### Step 3.2: Level-Up Modal

```typescript
// components/progress/LevelUpModal.tsx

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/useWindowSize';
import { Trophy, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LevelUpModal({
  show,
  oldLevel,
  newLevel,
  onClose,
}: {
  show: boolean;
  oldLevel: number;
  newLevel: number;
  onClose: () => void;
}) {
  const { width, height } = useWindowSize();

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Confetti */}
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
          />

          {/* Modal Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={onClose}
          >
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-white rounded-2xl p-8 max-w-md text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Animated Trophy */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center"
              >
                <Trophy className="w-12 h-12 text-white" />
              </motion.div>

              {/* Text */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-gray-900 mb-2"
              >
                Level Up!
              </motion.h2>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-6xl font-bold text-blue-600 my-6"
              >
                {oldLevel} → {newLevel}
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-gray-600 mb-8"
              >
                You're making amazing progress! Keep up the great work!
              </motion.p>

              {/* Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button onClick={onClose} className="px-8">
                  Awesome!
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Step 3.3: Achievement Unlock Animation

```typescript
// components/progress/AchievementUnlock.tsx

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Achievement } from '@/types/database';
import { Sparkles } from 'lucide-react';

const rarityColors = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-yellow-600',
};

export function AchievementUnlock({
  achievement,
  show,
  onClose,
}: {
  achievement: Achievement | null;
  show: boolean;
  onClose: () => void;
}) {
  if (!achievement) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: -100 }}
          transition={{ type: 'spring', damping: 15 }}
          className="fixed bottom-8 right-8 z-50"
        >
          <div
            className={`
              bg-gradient-to-br ${rarityColors[achievement.rarity]}
              rounded-lg shadow-2xl p-6 text-white max-w-sm
              border-4 border-white
            `}
          >
            {/* Sparkles */}
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute -top-3 -right-3"
            >
              <Sparkles className="w-8 h-8 text-yellow-300" />
            </motion.div>

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-3xl">{achievement.icon_url || '🏆'}</span>
              </div>

              {/* Content */}
              <div className="flex-1">
                <p className="text-xs uppercase font-bold opacity-90 mb-1">
                  {achievement.rarity} Achievement
                </p>
                <h3 className="font-bold text-lg mb-1">{achievement.name}</h3>
                <p className="text-sm opacity-90 mb-2">
                  {achievement.description}
                </p>
                <p className="text-sm font-bold">
                  +{achievement.xp_value} XP
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

## Phase 4: Progress Visualizations

### Step 4.1: Progress Circle

```typescript
// components/progress/ProgressCircle.tsx

'use client';

import { motion } from 'framer-motion';

export function ProgressCircle({
  progress,
  size = 120,
  strokeWidth = 8,
}: {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-blue-600"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>

      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
```

### Step 4.2: XP Progress Bar

```typescript
// components/progress/XPProgressBar.tsx

'use client';

import { motion } from 'framer-motion';
import { xpService } from '@/lib/progress/xp-service';

export function XPProgressBar({
  currentXP,
  currentLevel,
}: {
  currentXP: number;
  currentLevel: number;
}) {
  const xpForNextLevel = xpService.xpForLevel(currentLevel + 1);
  const xpIntoLevel = currentXP - xpService.cumulativeXPForLevel(currentLevel);
  const progress = (xpIntoLevel / xpForNextLevel) * 100;

  return (
    <div className="space-y-2">
      {/* Level info */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">
          Level {currentLevel}
        </span>
        <span className="text-gray-600">
          {xpIntoLevel} / {xpForNextLevel} XP
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
```

### Step 4.3: Activity Heat Map

```typescript
// components/progress/ActivityHeatMap.tsx

'use client';

import { motion } from 'framer-motion';
import { format, subDays, startOfWeek } from 'date-fns';

interface ActivityData {
  date: string;
  count: number;
}

export function ActivityHeatMap({ data }: { data: ActivityData[] }) {
  // Generate 52 weeks × 7 days grid
  const weeks = 52;
  const grid: (ActivityData | null)[][] = [];

  for (let week = 0; week < weeks; week++) {
    const weekDays: (ActivityData | null)[] = [];

    for (let day = 0; day < 7; day++) {
      const date = format(
        subDays(new Date(), week * 7 + (6 - day)),
        'yyyy-MM-dd'
      );

      const activity = data.find(d => d.date === date);
      weekDays.push(activity || null);
    }

    grid.push(weekDays);
  }

  // Color intensity based on activity count
  const getColor = (count: number | null) => {
    if (!count) return 'bg-gray-100';
    if (count >= 10) return 'bg-green-700';
    if (count >= 7) return 'bg-green-500';
    if (count >= 4) return 'bg-green-300';
    return 'bg-green-100';
  };

  return (
    <div className="inline-flex gap-1">
      {grid.map((week, weekIndex) => (
        <div key={weekIndex} className="flex flex-col gap-1">
          {week.map((day, dayIndex) => (
            <motion.div
              key={dayIndex}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: (weekIndex * 7 + dayIndex) * 0.001 }}
              className={`
                w-3 h-3 rounded-sm cursor-pointer
                ${getColor(day?.count || null)}
                hover:ring-2 hover:ring-blue-500
              `}
              title={
                day
                  ? `${day.date}: ${day.count} activities`
                  : 'No activity'
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

## Phase 5: Integration Example

### Complete Progress Dashboard

```typescript
// app/(dashboard)/student/progress/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useStudent } from '@/hooks/useStudent';
import { ProgressCircle } from '@/components/progress/ProgressCircle';
import { XPProgressBar } from '@/components/progress/XPProgressBar';
import { XPGainAnimation } from '@/components/progress/XPGainAnimation';
import { LevelUpModal } from '@/components/progress/LevelUpModal';
import { AchievementUnlock } from '@/components/progress/AchievementUnlock';
import { ActivityHeatMap } from '@/components/progress/ActivityHeatMap';

export default function ProgressPage() {
  const { student } = useStudent();
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newAchievement, setNewAchievement] = useState(null);
  const [xpGains, setXPGains] = useState([]);

  // Listen for celebration events
  useEffect(() => {
    const handleCelebration = (event: CustomEvent) => {
      const { type, data } = event.detail;

      if (type === 'xp-gain') {
        setXPGains(prev => [...prev, {
          id: Math.random().toString(),
          amount: data.xp,
          timestamp: Date.now(),
        }]);
      }

      if (type === 'level-up') {
        setShowLevelUp(true);
      }

      if (type === 'achievement') {
        setNewAchievement(data);
        setTimeout(() => setNewAchievement(null), 5000);
      }
    };

    window.addEventListener('celebration', handleCelebration as any);
    return () => window.removeEventListener('celebration', handleCelebration as any);
  }, []);

  if (!student) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Celebrations */}
      <XPGainAnimation xpGains={xpGains} />
      <LevelUpModal
        show={showLevelUp}
        oldLevel={student.level - 1}
        newLevel={student.level}
        onClose={() => setShowLevelUp(false)}
      />
      <AchievementUnlock
        achievement={newAchievement}
        show={!!newAchievement}
        onClose={() => setNewAchievement(null)}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Your Progress</h1>
        <p className="text-gray-600 mt-1">
          Track your learning journey and achievements
        </p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Course completion */}
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <ProgressCircle progress={student.courseProgress} />
          <p className="text-sm text-gray-600 mt-4">Course Completion</p>
        </div>

        {/* Level */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-4">
            <span className="text-5xl font-bold text-blue-600">
              {student.level}
            </span>
            <p className="text-sm text-gray-600 mt-2">Current Level</p>
          </div>
          <XPProgressBar
            currentXP={student.xp_points}
            currentLevel={student.level}
          />
        </div>

        {/* Streak */}
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-6xl mb-2">🔥</div>
          <div className="text-4xl font-bold text-orange-600">
            {student.streak_days}
          </div>
          <p className="text-sm text-gray-600 mt-2">Day Streak</p>
        </div>
      </div>

      {/* Activity heat map */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Activity</h2>
        <ActivityHeatMap data={student.activityData} />
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">
          Achievements ({student.achievements.length})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {student.achievements.map(achievement => (
            <div
              key={achievement.id}
              className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-2">{achievement.icon_url}</div>
              <p className="font-semibold text-sm">{achievement.name}</p>
              <p className="text-xs text-gray-600 mt-1">
                +{achievement.xp_value} XP
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Testing

### Test XP System

```typescript
// scripts/test-xp-system.ts

import { xpService } from '../lib/progress/xp-service';

async function testXPSystem() {
  console.log('Testing XP system...\n');

  // Test 1: Award XP
  const result = await xpService.awardXP(
    'test-student-id',
    'VIDEO_COMPLETED',
    { streakDays: 7 }
  );

  console.log('✅ XP awarded:', result);

  // Test 2: Level progression
  console.log('\n📊 Level progression:');
  for (let level = 1; level <= 10; level++) {
    const xp = xpService.xpForLevel(level + 1);
    const cumulative = xpService.cumulativeXPForLevel(level + 1);
    console.log(`Level ${level} → ${level + 1}: ${xp} XP (Total: ${cumulative})`);
  }
}

testXPSystem();
```

---

**You now have a complete gamification system!** 🎮
