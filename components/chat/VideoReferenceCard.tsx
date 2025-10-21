/**
 * Video Reference Card Component
 * Displays a clickable video reference with thumbnail and timestamp
 */

'use client';

import React from 'react';
import { VideoReference } from '@/types/database';
import { formatTimestamp } from '@/lib/utils/helpers';
import { PlayCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface VideoReferenceCardProps {
  reference: VideoReference;
  onClick?: (videoId: string, timestamp: number) => void;
  className?: string;
}

export function VideoReferenceCard({
  reference,
  onClick,
  className,
}: VideoReferenceCardProps) {
  const { video_id, title, timestamp, relevance_score } = reference;

  const handleClick = () => {
    if (onClick) {
      onClick(video_id, timestamp);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-blue-400 hover:shadow-md cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      {/* Play Icon */}
      <div className="flex-shrink-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100">
          <PlayCircle className="h-6 w-6" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {title}
          </h4>
          <ExternalLink className="h-4 w-4 flex-shrink-0 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
          <span className="font-mono">{formatTimestamp(timestamp)}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-500">
            {Math.round(relevance_score * 100)}% relevant
          </span>
        </div>
      </div>

      {/* Relevance Indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg overflow-hidden">
        <div
          className="h-full bg-blue-500"
          style={{ width: `${relevance_score * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Video Reference List Component
 * Displays multiple video references
 */
interface VideoReferenceListProps {
  references: VideoReference[];
  onVideoClick?: (videoId: string, timestamp: number) => void;
  className?: string;
}

export function VideoReferenceList({
  references,
  onVideoClick,
  className,
}: VideoReferenceListProps) {
  if (references.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Video References ({references.length})
      </p>
      <div className="space-y-2">
        {references.map((ref, index) => (
          <VideoReferenceCard
            key={`${ref.video_id}-${index}`}
            reference={ref}
            onClick={onVideoClick}
          />
        ))}
      </div>
    </div>
  );
}
