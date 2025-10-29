'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Video, Clock, Edit2, Trash2, Plus, FolderOpen } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  id?: string;
  title: string;
  description?: string;
  videoCount: number;
  totalDuration: number; // in seconds
  thumbnailUrl?: string;
  isAddCard?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function CourseCard({
  id,
  title,
  description,
  videoCount,
  totalDuration,
  thumbnailUrl,
  isAddCard = false,
  onClick,
  onEdit,
  onDelete,
  className
}: CourseCardProps) {
  // Format duration from seconds to readable format
  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0 min';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  // Special card for adding new courses
  if (isAddCard) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          hover
          padding="none"
          className={cn(
            'h-full cursor-pointer border-2 border-dashed border-border-default hover:border-accent-orange transition-all',
            className
          )}
          onClick={onClick}
        >
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] p-6 text-center">
            <div className="w-16 h-16 bg-accent-orange/10 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-accent-orange" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Create New Course
            </h3>
            <p className="text-sm text-text-muted">
              Organize your videos into structured learning paths
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        hover
        padding="none"
        className={cn(
          'h-full cursor-pointer bg-bg-card border-2 border-border-default hover:border-accent-orange/50 transition-all overflow-hidden',
          className
        )}
        onClick={onClick}
      >
        {/* Course Thumbnail or Placeholder */}
        <div className="aspect-video bg-bg-elevated relative">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FolderOpen className="w-16 h-16 text-text-muted" />
            </div>
          )}

          {/* Video Count Badge */}
          {videoCount > 0 && (
            <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5">
              <Video className="w-4 h-4" />
              <span className="text-sm font-medium">{videoCount} videos</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 bg-black/80 backdrop-blur-sm rounded-lg hover:bg-black/90 transition-colors"
                aria-label="Edit course"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 bg-black/80 backdrop-blur-sm rounded-lg hover:bg-black/90 transition-colors"
                aria-label="Delete course"
              >
                <Trash2 className="w-4 h-4 text-accent-red" />
              </button>
            )}
          </div>
        </div>

        {/* Course Info */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-1 line-clamp-1">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-text-muted mb-3 line-clamp-2">
              {description}
            </p>
          )}

          {/* Course Stats */}
          <div className="flex items-center gap-4 text-sm text-text-muted">
            {totalDuration > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(totalDuration)}</span>
              </div>
            )}
            {videoCount === 0 && (
              <span className="text-accent-yellow">No videos yet</span>
            )}
          </div>

          {/* Add Videos Button (shown when course is empty) */}
          {videoCount === 0 && onClick && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-3"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              Add Videos
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}