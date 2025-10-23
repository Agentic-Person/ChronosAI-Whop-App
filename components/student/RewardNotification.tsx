/**
 * RewardNotification Component
 * Toast notification when earning CHRONOS tokens
 * Shows animated coin icon with confetti for large rewards
 */

'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Video, MessageCircle, Flame } from 'lucide-react';
import toast from 'react-hot-toast';

interface RewardNotificationProps {
  amount: number;
  reason: 'video_completion' | 'chat_message' | 'daily_streak';
  show?: boolean;
  onDismiss?: () => void;
}

const reasonLabels = {
  video_completion: 'Video Completed',
  chat_message: 'Question Asked',
  daily_streak: 'Streak Bonus',
};

const reasonIcons = {
  video_completion: Video,
  chat_message: MessageCircle,
  daily_streak: Flame,
};

export const RewardNotification: React.FC<RewardNotificationProps> = ({
  amount,
  reason,
  show = true,
  onDismiss,
}) => {
  const Icon = reasonIcons[reason];
  const isLargeReward = amount >= 100;

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, x: 100 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.5, x: 100 }}
          transition={{
            type: 'spring',
            damping: 15,
            stiffness: 200,
          }}
          className="fixed top-20 right-8 z-50"
        >
          <div className="bg-bg-elevated border-2 border-accent-green rounded-lg p-4 shadow-xl flex items-center gap-3 min-w-[300px]">
            {/* Animated coin icon */}
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 0.6,
                times: [0, 0.5, 1],
              }}
              className="w-12 h-12 bg-gradient-success rounded-full flex items-center justify-center relative"
            >
              <Coins className="w-6 h-6 text-bg-app" />
              {isLargeReward && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.5, 0] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    repeatDelay: 0.5,
                  }}
                  className="absolute inset-0 bg-accent-green rounded-full opacity-20"
                />
              )}
            </motion.div>

            <div className="flex-1">
              <motion.p
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="font-bold text-xl text-accent-green"
              >
                +{amount} CHRONOS
              </motion.p>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Icon className="w-4 h-4" />
                <span>{reasonLabels[reason]}</span>
              </div>
            </div>

            {/* Confetti animation for large rewards */}
            {isLargeReward && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      x: '50%',
                      y: '50%',
                      scale: 0,
                    }}
                    animate={{
                      x: `${50 + (Math.random() - 0.5) * 100}%`,
                      y: `${50 + (Math.random() - 0.5) * 100}%`,
                      scale: [0, 1, 0],
                      rotate: Math.random() * 360,
                    }}
                    transition={{
                      duration: 1,
                      delay: i * 0.05,
                    }}
                    className="absolute w-2 h-2 bg-accent-green rounded-full"
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Helper function to show reward notification as toast
 */
export const showRewardToast = (
  amount: number,
  reason: 'video_completion' | 'chat_message' | 'daily_streak'
) => {
  toast.custom(
    (t) => (
      <RewardNotification
        amount={amount}
        reason={reason}
        show={t.visible}
        onDismiss={() => toast.dismiss(t.id)}
      />
    ),
    {
      duration: 5000,
      position: 'top-right',
    }
  );
};

export default RewardNotification;
