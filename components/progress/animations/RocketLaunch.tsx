'use client';

import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { useEffect } from 'react';

interface RocketLaunchProps {
  trajectory?: 'upward' | 'diagonal';
  smokeTrail?: boolean;
  stars?: boolean;
  duration?: number;
  onComplete?: () => void;
}

export function RocketLaunch({
  trajectory = 'upward',
  smokeTrail = true,
  stars = true,
  duration = 2500,
  onComplete,
}: RocketLaunchProps) {
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
        <Rocket size={64} className="rotate-45 text-orange-500" />
      </div>
    );
  }

  const endX = trajectory === 'diagonal' ? 200 : 0;
  const endY = -window.innerHeight / 2 - 100;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {/* Rocket */}
      <motion.div
        className="absolute bottom-0 left-1/2"
        initial={{
          x: -32,
          y: 0,
          opacity: 1,
          scale: 1,
          rotate: 45,
        }}
        animate={{
          x: endX - 32,
          y: endY,
          opacity: [1, 1, 1, 0],
          scale: [1, 1.2, 1.5, 0.5],
          rotate: 45,
        }}
        transition={{
          duration: duration / 1000,
          ease: [0.34, 1.56, 0.64, 1],
        }}
      >
        <Rocket
          size={64}
          className="text-orange-500"
          style={{
            filter: 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.8))',
          }}
        />

        {/* Rocket flame */}
        <motion.div
          className="absolute -bottom-4 left-0"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-b from-yellow-400 via-orange-500 to-red-600 blur-sm" />
        </motion.div>
      </motion.div>

      {/* Smoke Trail */}
      {smokeTrail &&
        [...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bottom-0 left-1/2"
            initial={{
              x: -16,
              y: -i * 30,
              opacity: 0,
              scale: 0,
            }}
            animate={{
              x: trajectory === 'diagonal' ? (endX * i) / 15 - 16 : -16 + (Math.random() - 0.5) * 40,
              y: -i * 30 + (endY * i) / 15,
              opacity: [0, 0.6, 0],
              scale: [0, 1.5, 2],
            }}
            transition={{
              duration: 2,
              delay: i * 0.1,
              ease: 'easeOut',
            }}
          >
            <div className="h-12 w-12 rounded-full bg-gray-400/30 blur-md" />
          </motion.div>
        ))}

      {/* Star Explosion at Top */}
      {stars && (
        <motion.div
          className="absolute left-1/2 top-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            duration: 1,
            delay: (duration - 800) / 1000,
          }}
        >
          {[...Array(12)].map((_, i) => {
            const angle = (Math.PI * 2 * i) / 12;
            const distance = 100;
            return (
              <motion.div
                key={i}
                className="absolute"
                initial={{
                  x: endX,
                  y: 0,
                  opacity: 0,
                  scale: 0,
                }}
                animate={{
                  x: endX + Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 0.8,
                  delay: (duration - 800) / 1000,
                  ease: 'easeOut',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFD700">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
