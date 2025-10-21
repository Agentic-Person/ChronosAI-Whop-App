'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
}

interface Firework {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
  particles: Particle[];
}

interface FireworksDisplayProps {
  explosions?: number;
  colors?: string[];
  duration?: number;
  onComplete?: () => void;
}

export function FireworksDisplay({
  explosions = 5,
  colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
  duration = 3000,
  onComplete,
}: FireworksDisplayProps) {
  const [fireworks, setFireworks] = useState<Firework[]>([]);

  useEffect(() => {
    const generatedFireworks: Firework[] = [];

    for (let i = 0; i < explosions; i++) {
      const x = 20 + Math.random() * 60; // 20-80% of screen width
      const y = 20 + Math.random() * 40; // 20-60% of screen height
      const color = colors[i % colors.length];
      const delay = i * 0.4;
      const particleCount = 20 + Math.floor(Math.random() * 10);

      const particles: Particle[] = [];
      for (let j = 0; j < particleCount; j++) {
        const angle = (Math.PI * 2 * j) / particleCount;
        const distance = 80 + Math.random() * 40;

        particles.push({
          id: j,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          color,
          delay: 0,
        });
      }

      generatedFireworks.push({
        id: i,
        x,
        y,
        color,
        delay,
        particles,
      });
    }

    setFireworks(generatedFireworks);

    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [explosions, colors, duration, onComplete]);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {fireworks.map((firework) => (
        <div
          key={firework.id}
          className="absolute"
          style={{
            left: `${firework.x}%`,
            top: `${firework.y}%`,
          }}
        >
          {/* Launch trail */}
          <motion.div
            className="absolute"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: [0, 1, 0] }}
            transition={{
              duration: 0.6,
              delay: firework.delay,
              ease: 'easeOut',
            }}
          >
            <div
              className="h-16 w-1 rounded-full"
              style={{
                background: `linear-gradient(to bottom, ${firework.color}, transparent)`,
              }}
            />
          </motion.div>

          {/* Explosion center */}
          <motion.div
            className="absolute"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.6,
              delay: firework.delay + 0.6,
              ease: 'easeOut',
            }}
          >
            <div
              className="h-4 w-4 rounded-full"
              style={{
                backgroundColor: firework.color,
                boxShadow: `0 0 20px ${firework.color}`,
              }}
            />
          </motion.div>

          {/* Explosion particles */}
          {firework.particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute"
              initial={{
                x: 0,
                y: 0,
                opacity: 0,
                scale: 0,
              }}
              animate={{
                x: particle.x,
                y: particle.y,
                opacity: [0, 1, 1, 0],
                scale: [0, 1, 0.8, 0],
              }}
              transition={{
                duration: 1.2,
                delay: firework.delay + 0.6,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: particle.color,
                  boxShadow: `0 0 10px ${particle.color}`,
                }}
              />
            </motion.div>
          ))}

          {/* Sparkle trails */}
          {firework.particles.slice(0, 8).map((particle) => (
            <motion.div
              key={`trail-${particle.id}`}
              className="absolute"
              initial={{
                x: 0,
                y: 0,
                opacity: 0,
              }}
              animate={{
                x: particle.x * 0.5,
                y: particle.y * 0.5,
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 0.8,
                delay: firework.delay + 0.7,
                ease: 'easeOut',
              }}
            >
              <div
                className="h-1 w-1 rounded-full"
                style={{
                  backgroundColor: particle.color,
                  filter: 'blur(1px)',
                }}
              />
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
}
