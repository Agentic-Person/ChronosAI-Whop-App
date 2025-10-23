/**
 * ChronosStats Component
 * Dashboard widget showing CHRONOS statistics
 * - Total earned, weekly earnings, current streak, next milestone
 */

'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, Flame, Target, Coins } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { motion } from 'framer-motion';

interface ChronosStatsProps {
  studentId: string;
}

interface Stats {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  weeklyEarnings: number;
  currentStreak: number;
  longestStreak: number;
  nextMilestone: number | null;
}

export const ChronosStats: React.FC<ChronosStatsProps> = ({ studentId }) => {
  const [stats, setStats] = useState<Stats>({
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    weeklyEarnings: 0,
    currentStreak: 0,
    longestStreak: 0,
    nextMilestone: 7,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch balance and wallet stats
        const balanceResponse = await fetch(
          `/api/chronos/balance?studentId=${studentId}`
        );
        const balanceData = await balanceResponse.json();

        // Fetch streak info
        const streakResponse = await fetch(
          `/api/chronos/streak?studentId=${studentId}`
        );
        const streakData = await streakResponse.json();

        // Calculate weekly earnings (simplified - would need actual weekly data)
        const weeklyEarnings = Math.floor(balanceData.totalEarned * 0.2); // Placeholder

        setStats({
          balance: balanceData.balance,
          totalEarned: balanceData.totalEarned,
          totalSpent: balanceData.totalSpent,
          weeklyEarnings,
          currentStreak: streakData.currentStreak || 0,
          longestStreak: streakData.longestStreak || 0,
          nextMilestone: streakData.milestoneProgress?.next || null,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [studentId]);

  const statCards = [
    {
      icon: Coins,
      label: 'Total Earned',
      value: stats.totalEarned.toLocaleString(),
      color: 'text-accent-green',
      bgColor: 'bg-accent-green/10',
    },
    {
      icon: TrendingUp,
      label: 'This Week',
      value: `+${stats.weeklyEarnings.toLocaleString()}`,
      color: 'text-accent-blue',
      bgColor: 'bg-accent-blue/10',
    },
    {
      icon: Flame,
      label: 'Current Streak',
      value: `${stats.currentStreak} days`,
      color: 'text-accent-orange',
      bgColor: 'bg-accent-orange/10',
    },
    {
      icon: Target,
      label: 'Next Milestone',
      value: stats.nextMilestone ? `${stats.nextMilestone} days` : 'Complete!',
      color: 'text-accent-purple',
      bgColor: 'bg-accent-purple/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="w-10 h-10 bg-bg-elevated rounded-full mb-3" />
              <div className="h-4 bg-bg-elevated rounded w-1/2 mb-2" />
              <div className="h-6 bg-bg-elevated rounded w-3/4" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="p-6 hover:border-accent-green transition-colors">
            <div className={`w-10 h-10 ${stat.bgColor} rounded-full flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-sm text-text-secondary mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default ChronosStats;
