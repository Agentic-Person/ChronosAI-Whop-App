/**
 * Wallet Page
 * Full CHRONOS wallet view with balance, transaction history, and streak info
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Coins, TrendingUp, Flame } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { TransactionHistory } from '@/components/student/TransactionHistory';
import { createClient } from '@/lib/utils/supabase-client';
import { motion } from 'framer-motion';

export default function WalletPage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setStudentId(user.id);

      try {
        // Fetch balance
        const balanceResponse = await fetch(`/api/chronos/balance?studentId=${user.id}`);
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          setBalance(balanceData.balance);
          setTotalEarned(balanceData.totalEarned);
        }

        // Fetch streak
        const streakResponse = await fetch(`/api/chronos/streak?studentId=${user.id}`);
        if (streakResponse.ok) {
          const streakData = await streakResponse.json();
          setCurrentStreak(streakData.currentStreak);
        }
      } catch (error) {
        console.error('Failed to fetch wallet data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-bg-elevated rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-bg-elevated rounded-lg" />
            ))}
          </div>
          <div className="h-96 bg-bg-elevated rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">CHRONOS Wallet</h1>
        <p className="text-text-secondary">
          Track your tokens, earnings, and streaks
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 border-2 border-accent-green">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-text-secondary mb-1">Current Balance</p>
                <h2 className="text-4xl font-bold text-accent-green">
                  {balance.toLocaleString()}
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  ≈ ${(balance * 0.001).toFixed(2)} USD
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-success rounded-full flex items-center justify-center">
                <Coins className="w-8 h-8 text-bg-app" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-text-secondary mb-1">Total Earned</p>
                <h2 className="text-3xl font-bold">{totalEarned.toLocaleString()}</h2>
                <p className="text-sm text-accent-green mt-1 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  All time
                </p>
              </div>
              <div className="w-16 h-16 bg-accent-blue/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-accent-blue" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-text-secondary mb-1">Current Streak</p>
                <h2 className="text-3xl font-bold">{currentStreak}</h2>
                <p className="text-sm text-accent-orange mt-1 flex items-center gap-1">
                  <Flame className="w-4 h-4" />
                  {currentStreak === 1 ? 'day' : 'days'}
                </p>
              </div>
              <div className="w-16 h-16 bg-accent-orange/10 rounded-full flex items-center justify-center">
                <Flame className="w-8 h-8 text-accent-orange" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {studentId && <TransactionHistory studentId={studentId} />}
      </motion.div>

      {/* Redemption Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8"
      >
        <Card className="p-8 text-center bg-gradient-to-br from-bg-elevated to-bg-app">
          <h3 className="text-xl font-bold mb-2">Token Redemption Coming Soon</h3>
          <p className="text-text-secondary max-w-md mx-auto">
            Soon you'll be able to redeem your CHRONOS tokens for premium features,
            exclusive content, and more!
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
