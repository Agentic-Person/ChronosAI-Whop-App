import React from 'react';
import { Play, Clock, Zap, Coins, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, formatDuration } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';

export interface VideoCardProps {
  thumbnail: string;
  title: string;
  duration: number; // in seconds
  xpReward: number;
  chronosReward: number;
  completed: boolean;
  progress?: number; // 0-100
  onWatch: () => void;
  className?: string;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  thumbnail,
  title,
  duration,
  xpReward,
  chronosReward,
  completed,
  progress = 0,
  onWatch,
  className,
}) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        'video-card relative cursor-pointer group',
        completed && 'opacity-75',
        className
      )}
      onClick={onWatch}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover"
        />

        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 bg-accent-cyan rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-bg-app fill-current ml-1" />
          </div>
        </div>

        {/* Completion Badge */}
        {completed && (
          <div className="absolute top-2 right-2 w-8 h-8 bg-accent-green rounded-full flex items-center justify-center">
            <Check className="w-5 h-5 text-bg-app" />
          </div>
        )}

        {/* Duration */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/75 rounded text-xs font-semibold">
          {formatDuration(duration)}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-accent-cyan transition-colors">
          {title}
        </h3>

        {/* Rewards */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-accent-yellow">
            <Zap size={14} />
            <span className="font-semibold">{xpReward} XP</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-accent-green">
            <Coins size={14} />
            <span className="font-semibold">{chronosReward} CHRONOS</span>
          </div>
        </div>

        {/* Progress Bar */}
        {progress > 0 && progress < 100 && (
          <ProgressBar value={progress} size="sm" color="cyan" />
        )}
      </div>
    </motion.div>
  );
};
