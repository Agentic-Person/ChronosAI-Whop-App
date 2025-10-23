'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Clock, CheckCircle, AlertCircle, RotateCw, Loader2 } from 'lucide-react';
import { ProcessingVideo } from '@/lib/creator/analytics';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ProcessingQueueProps {
  videos: ProcessingVideo[];
  onRetry?: (videoId: string) => void;
  className?: string;
}

export function ProcessingQueue({ videos, onRetry, className }: ProcessingQueueProps) {
  if (videos.length === 0) {
    return (
      <Card padding="lg" className={cn('bg-bg-card border border-border-default', className)}>
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-accent-green mx-auto mb-3" />
          <p className="text-text-secondary">No videos processing</p>
        </div>
      </Card>
    );
  }

  const getStatusIcon = (status: ProcessingVideo['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-text-muted" />;
      case 'transcribing':
      case 'chunking':
      case 'embedding':
        return <Loader2 className="w-5 h-5 text-accent-cyan animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-accent-green" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-accent-red" />;
    }
  };

  const getStatusLabel = (status: ProcessingVideo['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'transcribing':
        return 'Transcribing';
      case 'chunking':
        return 'Chunking';
      case 'embedding':
        return 'Generating Embeddings';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
    }
  };

  const getStatusColor = (status: ProcessingVideo['status']) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'transcribing':
      case 'chunking':
      case 'embedding':
        return 'warning';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
    }
  };

  return (
    <Card padding="none" className={cn('bg-bg-card border border-border-default', className)}>
      <div className="p-4 border-b border-border-default">
        <h3 className="text-lg font-bold">Processing Queue</h3>
      </div>

      <div className="divide-y divide-border-default">
        {videos.map((video) => (
          <div key={video.id} className="p-4 hover:bg-bg-hover transition-colors">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(video.status)}
                  <h4 className="font-semibold truncate">{video.title}</h4>
                </div>
                <p className="text-sm text-text-muted">
                  Started {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                </p>
              </div>
              <Badge variant={getStatusColor(video.status)}>
                {getStatusLabel(video.status)}
              </Badge>
            </div>

            {video.status !== 'failed' && video.status !== 'completed' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Progress</span>
                  <span className="font-medium">{video.progress}%</span>
                </div>
                <ProgressBar value={video.progress} className="h-2" />
              </div>
            )}

            {video.status === 'failed' && (
              <div className="space-y-2">
                {video.error_message && (
                  <p className="text-sm text-accent-red">{video.error_message}</p>
                )}
                {onRetry && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onRetry(video.id)}
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Retry Processing
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
