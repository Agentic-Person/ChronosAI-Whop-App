'use client';

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useEffect } from 'react';

interface TrophyAnimationProps {
  size?: 'small' | 'medium' | 'large';
  shine?: boolean;
  bounce?: boolean;
  duration?: number;
  onComplete?: () => void;
}

export function TrophyAnimation({
  size = 'large',
  shine = true,
  bounce = true,
  duration = 2000,
  onComplete,
}: TrophyAnimationProps) {
  const sizeMap = {
    small: 64,
    medium: 96,
    large: 128,
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Trophy size={sizeMap[size]} className="text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0 }}
        animate={{
          y: bounce ? [100, -20, 0] : [100, 0],
          opacity: [0, 1, 1],
          scale: [0, 1.2, 1],
          rotate: [0, -10, 10, 0],
        }}
        transition={{
          duration: duration / 1000,
          times: bounce ? [0, 0.6, 1] : [0, 1],
          ease: 'easeOut',
        }}
        className="relative"
      >
        {/* Trophy Icon */}
        <Trophy
          size={sizeMap[size]}
          className="text-yellow-500"
          style={{
            filter: 'drop-shadow(0 0 20px rgba(234, 179, 8, 0.7))',
          }}
        />

        {/* Shine Effect */}
        {shine && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className="h-full w-full rounded-full bg-gradient-to-r from-transparent via-yellow-200 to-transparent opacity-30" />
          </motion.div>
        )}

        {/* Sparkles */}
        {[...Array(8)].map((_, i) => {
          const angle = (Math.PI * 2 * i) / 8;
          const distance = 80;
          return (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2"
              initial={{
                x: 0,
                y: 0,
                opacity: 0,
                scale: 0,
              }}
              animate={{
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 1,
                delay: 0.3 + i * 0.05,
                ease: 'easeOut',
              }}
            >
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Confetti */}
      {[...Array(20)].map((_, i) => {
        const angle = (Math.PI * 2 * i) / 20;
        const velocity = 200 + Math.random() * 100;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2"
            initial={{
              x: 0,
              y: 0,
              opacity: 1,
              scale: 0,
            }}
            animate={{
              x: Math.cos(angle) * velocity,
              y: Math.sin(angle) * velocity - 50,
              opacity: [1, 1, 0],
              scale: [0, 1, 0],
              rotate: Math.random() * 360,
            }}
            transition={{
              duration: duration / 1000,
              delay: 0.5,
              ease: 'easeOut',
            }}
          >
            <div
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor: ['#FFD700', '#FFA500', '#FF6347', '#4169E1'][i % 4],
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
