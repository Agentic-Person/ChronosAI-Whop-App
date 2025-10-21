'use client';

import { useEffect } from 'react';
import Confetti from 'react-confetti';

interface ConfettiCelebrationProps {
  duration?: number;
  particleCount?: number;
  colors?: string[];
  gravity?: number;
  onComplete?: () => void;
}

export function ConfettiCelebration({
  duration = 3000,
  particleCount = 200,
  colors = [
    '#FFD700',
    '#FFA500',
    '#FF6347',
    '#4169E1',
    '#9370DB',
    '#00FF00',
    '#FF1493',
    '#00CED1',
  ],
  gravity = 0.3,
  onComplete,
}: ConfettiCelebrationProps) {
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
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <Confetti
        width={typeof window !== 'undefined' ? window.innerWidth : 1000}
        height={typeof window !== 'undefined' ? window.innerHeight : 1000}
        numberOfPieces={particleCount}
        recycle={false}
        gravity={gravity}
        colors={colors}
        tweenDuration={duration}
      />
    </div>
  );
}
