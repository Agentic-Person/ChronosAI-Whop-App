/**
 * ChronosBalance Component
 * Token counter widget for header navigation
 * Shows current balance with animated count-up and breakdown tooltip
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Tooltip } from '@/components/ui/Tooltip';

interface ChronosBalanceProps {
  studentId: string;
  initialBalance?: number;
}

export const ChronosBalance: React.FC<ChronosBalanceProps> = ({
  studentId,
  initialBalance = 0,
}) => {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [displayBalance, setDisplayBalance] = useState(initialBalance);
  const [breakdown, setBreakdown] = useState({
    totalEarned: 0,
    totalSpent: 0,
    totalRedeemed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch balance on mount and set up polling
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch(`/api/chronos/balance?studentId=${studentId}`);
        if (response.ok) {
          const data = await response.json();
          setBalance(data.balance);
          setBreakdown({
            totalEarned: data.totalEarned,
            totalSpent: data.totalSpent,
            totalRedeemed: data.totalRedeemed,
          });
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [studentId]);

  // Animate balance count-up when it changes
  useEffect(() => {
    if (balance === displayBalance) return;

    const diff = balance - displayBalance;
    const increment = diff > 0 ? Math.ceil(diff / 10) : Math.floor(diff / 10);
    const timer = setInterval(() => {
      setDisplayBalance((prev) => {
        const next = prev + increment;
        if (
          (increment > 0 && next >= balance) ||
          (increment < 0 && next <= balance)
        ) {
          clearInterval(timer);
          return balance;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [balance, displayBalance]);

  const handleClick = () => {
    router.push('/dashboard/wallet');
  };

  const tooltipContent = (
    <div className="text-sm">
      <div className="font-semibold mb-2">CHRONOS Breakdown</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-text-secondary">Total Earned:</span>
          <span className="font-medium">{breakdown.totalEarned.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-secondary">Total Spent:</span>
          <span className="font-medium">{breakdown.totalSpent.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-secondary">Total Redeemed:</span>
          <span className="font-medium">{breakdown.totalRedeemed.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className="flex items-center gap-2 bg-gradient-success px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
      >
        <Coins className="w-5 h-5 text-bg-app" />
        <AnimatePresence mode="wait">
          <motion.span
            key={displayBalance}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="font-bold text-bg-app"
          >
            {isLoading ? '...' : displayBalance.toLocaleString()}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </Tooltip>
  );
};

export default ChronosBalance;
