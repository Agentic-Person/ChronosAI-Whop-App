'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  delay: number;
}

interface StarsExplosionProps {
  particleCount?: number;
  colors?: string[];
  duration?: number;
  onComplete?: () => void;
}

export function StarsExplosion({
  particleCount = 50,
  colors = ['#FFD700', '#FFA500', '#FFFF00'],
  duration = 3000,
  onComplete,
}: StarsExplosionProps) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // Generate random star positions
    const generatedStars: Star[] = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = 100 + Math.random() * 150;

      generatedStars.push({
        id: i,
        x: Math.cos(angle) * velocity,
        y: Math.sin(angle) * velocity,
        size: 8 + Math.random() * 12,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.2,
      });
    }
    setStars(generatedStars);

    // Call onComplete when animation finishes
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [particleCount, duration, onComplete]);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute"
          initial={{
            x: 0,
            y: 0,
            opacity: 1,
            scale: 0,
            rotate: 0,
          }}
          animate={{
            x: star.x,
            y: star.y,
            opacity: [1, 1, 0],
            scale: [0, 1.2, 0.8, 0],
            rotate: star.rotation,
          }}
          transition={{
            duration: duration / 1000,
            delay: star.delay,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          <svg
            width={star.size}
            height={star.size}
            viewBox="0 0 24 24"
            fill={colors[star.id % colors.length]}
            style={{
              filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.5))',
            }}
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
