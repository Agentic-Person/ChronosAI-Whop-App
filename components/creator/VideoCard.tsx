'use client';

import React from 'react';
import { Play, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { cn } from '@/lib/utils';
import { VideoWithStats } from '@/lib/creator/videoManager';

interface VideoCardProps {
  video: VideoWithStats;
  onEdit?: (video: VideoWithStats) => void;
  onDelete?: (videoId: string) => void;
  onClick?: (video: VideoWithStats) => void;
  className?: string;
}

export function VideoCard({
  video,
  onEdit,
  onDelete,
  onClick,
  className,
}: VideoCardProps) {
  const getStatusBadge = () => {
    switch (video.status) {
      case 'completed':
        return <Badge variant="success">Ready</Badge>;
      case 'processing':
        return <Badge variant="warning">Processing</Badge>;
      case 'pending':
        return <Badge variant="default">Pending</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card
      padding="none"
      hover
      className={cn(
        'bg-bg-card border border-border-default overflow-hidden cursor-pointer',
        className
      )}
      onClick={() => onClick?.(video)}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-bg-elevated flex items-center justify-center">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Play className="w-12 h-12 text-accent-cyan" />
        )}

        {/* Duration Badge */}
        {video.duration_seconds && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video.duration_seconds)}
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 right-2">{getStatusBadge()}</div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold mb-2 line-clamp-2">{video.title}</h3>

        {video.description && (
          <p className="text-sm text-text-muted mb-3 line-clamp-2">
            {video.description}
          </p>
        )}

        {/* Stats */}
        {video.status === 'completed' && (
          <div className="flex items-center gap-4 text-sm text-text-muted mb-3">
            <div>
              <span className="font-semibold text-text-primary">{video.views}</span> views
            </div>
            <div>
              <span className="font-semibold text-text-primary">{video.completions}</span>{' '}
              completions
            </div>
            <div>
              <span className="font-semibold text-accent-green">{video.avgCompletion}%</span>{' '}
              avg
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border-default">
          <p className="text-xs text-text-muted">
            {new Date(video.created_at).toLocaleDateString()}
          </p>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(video)}
                disabled={video.status !== 'completed'}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(video.id)}
              >
                <Trash2 className="w-4 h-4 text-accent-red" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
