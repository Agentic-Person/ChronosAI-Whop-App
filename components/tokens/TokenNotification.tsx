'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins } from 'lucide-react';

export interface TokenNotificationProps {
  amount: number;
  source: string;
  show: boolean;
  onComplete?: () => void;
}

export const TokenNotification: React.FC<TokenNotificationProps> = ({
  amount,
  source,
  show,
  onComplete,
}) => {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: -50 }}
          transition={{
            type: 'spring',
            damping: 15,
            stiffness: 300,
          }}
          className="fixed bottom-8 right-8 z-50"
        >
          <div className="bg-bg-elevated border-2 border-accent-green rounded-lg p-4 shadow-xl flex items-center gap-3 min-w-[280px]">
            <div className="w-12 h-12 bg-gradient-success rounded-full flex items-center justify-center animate-bounce">
              <Coins className="w-6 h-6 text-bg-app" />
            </div>
            <div>
              <p className="font-bold text-lg text-accent-green">+{amount} CHRONOS</p>
              <p className="text-sm text-text-secondary">{source}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
