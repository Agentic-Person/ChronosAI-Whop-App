'use client';

import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Grid, List, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { VideoCard } from './VideoCard';
import { VideoDetailModal } from './VideoDetailModal';
import { VideoWithStats } from '@/lib/creator/videoManager';
import { cn } from '@/lib/utils';

interface VideoLibraryProps {
  videos: VideoWithStats[];
  onEdit?: (videoId: string, updates: { title: string; description: string }) => void;
  onDelete?: (videoId: string) => void;
  onBulkDelete?: (videoIds: string[]) => void;
  className?: string;
}

export function VideoLibrary({
  videos,
  onEdit,
  onDelete,
  onBulkDelete,
  className,
}: VideoLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [selectedVideo, setSelectedVideo] = useState<VideoWithStats | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filteredVideos, setFilteredVideos] = useState<VideoWithStats[]>(videos);

  useEffect(() => {
    let result = videos;

    // Apply search filter
    if (searchQuery) {
      result = result.filter((video) =>
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((video) => video.status === statusFilter);
    }

    setFilteredVideos(result);
  }, [videos, searchQuery, statusFilter]);

  const handleVideoClick = (video: VideoWithStats) => {
    setSelectedVideo(video);
    setShowDetailModal(true);
  };

  const handleToggleSelection = (videoId: string) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }
    setSelectedVideos(newSelection);
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedVideos.size > 0) {
      onBulkDelete(Array.from(selectedVideos));
      setSelectedVideos(new Set());
    }
  };

  const statusCounts = {
    all: videos.length,
    processing: videos.filter((v) => v.status === 'processing').length,
    completed: videos.filter((v) => v.status === 'completed').length,
    failed: videos.filter((v) => v.status === 'failed').length,
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos..."
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-bg-elevated rounded-lg p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                statusFilter === 'all'
                  ? 'bg-bg-card text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              All ({statusCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                statusFilter === 'completed'
                  ? 'bg-bg-card text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              Ready ({statusCounts.completed})
            </button>
            <button
              onClick={() => setStatusFilter('processing')}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                statusFilter === 'processing'
                  ? 'bg-bg-card text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              Processing ({statusCounts.processing})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-bg-elevated rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'grid'
                  ? 'bg-bg-card text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'list'
                  ? 'bg-bg-card text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedVideos.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-accent-cyan/10 border border-accent-cyan/20 rounded-lg">
          <p className="text-sm font-medium">
            {selectedVideos.size} video{selectedVideos.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedVideos(new Set())}>
              Clear Selection
            </Button>
            <Button variant="secondary" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Video Grid/List */}
      {filteredVideos.length > 0 ? (
        <div
          className={cn(
            'grid gap-4',
            viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
          )}
        >
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onClick={handleVideoClick}
              onEdit={onEdit ? () => {
                setSelectedVideo(video);
                setShowDetailModal(true);
              } : undefined}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-text-muted mb-2">No videos found</p>
          <p className="text-sm text-text-secondary">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Upload your first video to get started'}
          </p>
        </div>
      )}

      {/* Video Detail Modal */}
      <VideoDetailModal
        video={selectedVideo}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedVideo(null);
        }}
        onSave={onEdit}
      />
    </div>
  );
}
