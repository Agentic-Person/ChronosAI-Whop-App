'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Play, Users, Eye, CheckCircle, MessageSquare } from 'lucide-react';
import { VideoWithStats } from '@/lib/creator/videoManager';
import { getVideoAnalyticsSummary, getVideoProcessingStatus } from '@/lib/creator/analytics';

interface VideoDetailModalProps {
  video: VideoWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (videoId: string, updates: { title: string; description: string }) => void;
}

export function VideoDetailModal({
  video,
  isOpen,
  onClose,
  onSave,
}: VideoDetailModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [processingStatus, setProcessingStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setDescription(video.description || '');
      loadVideoDetails();
    }
  }, [video]);

  const loadVideoDetails = async () => {
    if (!video) return;

    if (video.status === 'processing') {
      const status = await getVideoProcessingStatus(video.id);
      setProcessingStatus(status);
    }
  };

  const handleSave = () => {
    if (!video || !onSave) return;

    onSave(video.id, {
      title,
      description,
    });

    onClose();
  };

  if (!video) return null;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'transcribing':
        return 'Transcribing Audio';
      case 'chunking':
        return 'Chunking Transcript';
      case 'embedding':
        return 'Generating Embeddings';
      case 'completed':
        return 'Processing Complete';
      case 'failed':
        return 'Processing Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Video Details" size="lg">
      <div className="space-y-6">
        {/* Video Preview */}
        <div className="aspect-video bg-bg-elevated rounded-lg flex items-center justify-center">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Play className="w-16 h-16 text-accent-cyan" />
          )}
        </div>

        {/* Editable Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Video description (optional)"
              className="w-full px-3 py-2 bg-bg-elevated border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Processing Status */}
        {video.status === 'processing' && processingStatus && (
          <div className="bg-bg-elevated rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{getStatusLabel(processingStatus.status)}</span>
              <Badge variant="warning">{processingStatus.progress}%</Badge>
            </div>
            <ProgressBar value={processingStatus.progress} className="h-2" />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-text-muted">Transcript:</span>{' '}
                {processingStatus.hasTranscript ? (
                  <CheckCircle className="w-4 h-4 text-accent-green inline" />
                ) : (
                  <span className="text-text-muted">Pending</span>
                )}
              </div>
              <div>
                <span className="text-text-muted">Chunks:</span>{' '}
                <span className="font-medium">{processingStatus.chunkCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Analytics */}
        {video.status === 'completed' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-elevated rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-accent-cyan" />
                <span className="text-sm text-text-muted">Views</span>
              </div>
              <p className="text-2xl font-bold">{video.views}</p>
            </div>

            <div className="bg-bg-elevated rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-accent-green" />
                <span className="text-sm text-text-muted">Completions</span>
              </div>
              <p className="text-2xl font-bold">{video.completions}</p>
            </div>

            <div className="bg-bg-elevated rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-accent-purple" />
                <span className="text-sm text-text-muted">Avg Completion</span>
              </div>
              <p className="text-2xl font-bold">{video.avgCompletion}%</p>
            </div>

            <div className="bg-bg-elevated rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-accent-yellow" />
                <span className="text-sm text-text-muted">Questions</span>
              </div>
              <p className="text-2xl font-bold">12</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          {onSave && (
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={!title.trim()}
            >
              Save Changes
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
