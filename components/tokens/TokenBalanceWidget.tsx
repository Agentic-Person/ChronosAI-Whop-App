import React from 'react';
import { Coins, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TokenBalanceWidgetProps {
  balance: number;
  change?: number; // Change since last period
  showUSDValue?: boolean;
  usdRate?: number;
  onClick?: () => void;
  className?: string;
}

export const TokenBalanceWidget: React.FC<TokenBalanceWidgetProps> = ({
  balance,
  change,
  showUSDValue = false,
  usdRate = 0.001,
  onClick,
  className,
}) => {
  const usdValue = balance * usdRate;
  const hasPositiveChange = change !== undefined && change > 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'card p-6 cursor-pointer hover:border-accent-green transition-colors',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-text-secondary mb-1">CHRONOS Balance</p>
          <h3 className="text-3xl font-bold text-accent-green">
            {balance.toLocaleString()}
          </h3>
          {showUSDValue && (
            <p className="text-sm text-text-muted mt-1">
              ≈ ${usdValue.toFixed(2)} USD
            </p>
          )}
        </div>
        <div className="w-12 h-12 bg-gradient-success rounded-full flex items-center justify-center">
          <Coins className="w-6 h-6 text-bg-app" />
        </div>
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-2">
          <TrendingUp
            size={16}
            className={cn(
              hasPositiveChange ? 'text-accent-green' : 'text-accent-red',
              !hasPositiveChange && 'rotate-180'
            )}
          />
          <span
            className={cn(
              'text-sm font-semibold',
              hasPositiveChange ? 'text-accent-green' : 'text-accent-red'
            )}
          >
            {hasPositiveChange ? '+' : ''}
            {change} CHRONOS this week
          </span>
        </div>
      )}
    </motion.div>
  );
};
