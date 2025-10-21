'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap } from 'lucide-react';
import { useEffect } from 'react';
import Confetti from 'react-confetti';

interface LevelUpModalProps {
  oldLevel: number;
  newLevel: number;
  animation?: 'scale-burst' | 'slide-up' | 'fade';
  confetti?: boolean;
  duration?: number;
  onClose?: () => void;
}

export function LevelUpModal({
  oldLevel,
  newLevel,
  animation = 'scale-burst',
  confetti = true,
  duration = 3000,
  onClose,
}: LevelUpModalProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const variants = {
    'scale-burst': {
      initial: { scale: 0, opacity: 0, rotate: -180 },
      animate: { scale: 1, opacity: 1, rotate: 0 },
      exit: { scale: 0, opacity: 0, rotate: 180 },
    },
    'slide-up': {
      initial: { y: 100, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: -100, opacity: 0 },
    },
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
  };

  const selectedVariant = prefersReducedMotion ? variants.fade : variants[animation];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Background Overlay */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Confetti */}
        {confetti && !prefersReducedMotion && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            numberOfPieces={200}
            recycle={false}
            gravity={0.3}
            colors={['#FFD700', '#FFA500', '#FF6347', '#4169E1', '#9370DB']}
          />
        )}

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 p-8 shadow-2xl"
          variants={selectedVariant}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration: 0.5,
            type: 'spring',
            stiffness: 200,
            damping: 20,
          }}
        >
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X size={24} />
            </button>
          )}

          {/* Content */}
          <div className="flex flex-col items-center space-y-6 text-white">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{
                scale: [0, 1.2, 1],
                rotate: [- 180, 0],
              }}
              transition={{
                duration: 0.6,
                delay: 0.2,
                type: 'spring',
                stiffness: 200,
              }}
            >
              <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm">
                <Zap size={48} className="text-yellow-400" fill="currentColor" />
              </div>
            </motion.div>

            {/* Text */}
            <div className="space-y-2 text-center">
              <motion.h2
                className="text-4xl font-bold"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Level Up!
              </motion.h2>

              <motion.div
                className="flex items-center justify-center space-x-4 text-3xl font-bold"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <span className="text-white/60">{oldLevel}</span>
                <span className="text-yellow-400">→</span>
                <motion.span
                  className="text-yellow-400"
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{
                    delay: 0.5,
                    duration: 0.5,
                    repeat: 2,
                  }}
                >
                  {newLevel}
                </motion.span>
              </motion.div>

              <motion.p
                className="text-lg text-white/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                You're on fire! Keep learning!
              </motion.p>
            </div>

            {/* Progress Bar */}
            <motion.div
              className="w-full overflow-hidden rounded-full bg-white/20"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '100%' }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <motion.div
                className="h-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{
                  delay: 0.8,
                  duration: 1,
                  ease: 'easeOut',
                }}
              />
            </motion.div>

            {/* Particles */}
            {!prefersReducedMotion &&
              [...Array(8)].map((_, i) => {
                const angle = (Math.PI * 2 * i) / 8;
                const distance = 100;
                return (
                  <motion.div
                    key={i}
                    className="absolute"
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
                      delay: 0.5,
                      ease: 'easeOut',
                    }}
                  >
                    <Zap size={16} className="text-yellow-400" fill="currentColor" />
                  </motion.div>
                );
              })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
