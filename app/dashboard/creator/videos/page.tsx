'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Link as LinkIcon,
  QrCode,
  X,
  Play,
  Trash2,
  Edit2,
  MoreVertical,
  Check,
  Clock,
  AlertCircle,
  GripVertical, // Using GripVertical instead of DragHandleDots2
  Youtube,
  FolderOpen,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

type UploadMethod = 'file' | 'youtube' | 'qr';
type VideoStatus = 'processing' | 'ready' | 'error';

interface Video {
  id: string;
  title: string;
  duration: string;
  thumbnail?: string;
  status: VideoStatus;
  uploadedAt: string;
  module?: string;
  week?: number;
  day?: number;
  views: number;
  completions: number;
  chronosMultiplier: number;
}

export default function CreatorVideosPage() {
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('file');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock data
  const [videos, setVideos] = useState<Video[]>([
    {
      id: '1',
      title: 'Introduction to Variables and Data Types',
      duration: '12:34',
      status: 'ready',
      uploadedAt: '2024-01-15',
      module: 'Module 2',
      week: 1,
      day: 1,
      views: 245,
      completions: 180,
      chronosMultiplier: 1.0,
    },
    {
      id: '2',
      title: 'Functions and Scope Explained',
      duration: '18:22',
      status: 'ready',
      uploadedAt: '2024-01-14',
      module: 'Module 2',
      week: 1,
      day: 2,
      views: 198,
      completions: 142,
      bloxMultiplier: 1.2,
    },
    {
      id: '3',
      title: 'Working with Arrays and Loops',
      duration: '15:48',
      status: 'processing',
      uploadedAt: '2024-01-16',
      views: 0,
      completions: 0,
      chronosMultiplier: 1.0,
    },
  ]);

  const stats = {
    totalVideos: videos.length,
    totalViews: videos.reduce((sum, v) => sum + v.views, 0),
    avgCompletion: Math.round(
      (videos.reduce((sum, v) => sum + v.completions, 0) /
        videos.reduce((sum, v) => sum + v.views, 0)) *
        100
    ),
    processingCount: videos.filter((v) => v.status === 'processing').length,
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileUpload(files);
    }
  };

  const handleFileUpload = (files: File[]) => {
    // Mock upload - would call API
    console.log('Uploading files:', files);
    setShowUploadModal(false);
    // Add processing videos to list
    files.forEach((file) => {
      const newVideo: Video = {
        id: Date.now().toString(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        duration: '0:00',
        status: 'processing',
        uploadedAt: new Date().toISOString().split('T')[0],
        views: 0,
        completions: 0,
        chronosMultiplier: 1.0,
      };
      setVideos((prev) => [newVideo, ...prev]);
    });
  };

  const handleYoutubeUpload = () => {
    if (!youtubeUrl.trim()) return;
    // Mock YouTube upload - would call API
    console.log('Uploading YouTube video:', youtubeUrl);
    const newVideo: Video = {
      id: Date.now().toString(),
      title: 'Imported from YouTube',
      duration: '0:00',
      status: 'processing',
      uploadedAt: new Date().toISOString().split('T')[0],
      views: 0,
      completions: 0,
      chronosMultiplier: 1.0,
    };
    setVideos((prev) => [newVideo, ...prev]);
    setYoutubeUrl('');
    setShowUploadModal(false);
  };

  const handleDeleteVideo = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  };

  const handleEditVideo = (video: Video) => {
    setSelectedVideo(video);
    setShowEditModal(true);
  };

  const getStatusIcon = (status: VideoStatus) => {
    switch (status) {
      case 'ready':
        return <Check className="w-4 h-4 text-accent-green" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-accent-yellow animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-accent-red" />;
    }
  };

  const getStatusBadge = (status: VideoStatus) => {
    switch (status) {
      case 'ready':
        return (
          <Badge variant="success" className="capitalize">
            Ready
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="warning" className="capitalize">
            Processing
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="error" className="capitalize">
            Error
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Video Management</h1>
            <p className="text-text-secondary">Upload, organize, and manage your course videos</p>
          </div>
          <Button size="lg" onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Videos
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="lg" className="bg-bg-card border border-border-default">
            <p className="text-text-muted text-sm mb-1">Total Videos</p>
            <p className="text-3xl font-bold">{stats.totalVideos}</p>
          </Card>
          <Card padding="lg" className="bg-bg-card border border-border-default">
            <p className="text-text-muted text-sm mb-1">Total Views</p>
            <p className="text-3xl font-bold">{stats.totalViews.toLocaleString()}</p>
          </Card>
          <Card padding="lg" className="bg-bg-card border border-border-default">
            <p className="text-text-muted text-sm mb-1">Avg Completion</p>
            <p className="text-3xl font-bold">{stats.avgCompletion}%</p>
          </Card>
          <Card padding="lg" className="bg-bg-card border border-border-default">
            <p className="text-text-muted text-sm mb-1">Processing</p>
            <p className="text-3xl font-bold">{stats.processingCount}</p>
          </Card>
        </div>
      </div>

      {/* Video List */}
      <Card padding="none" className="bg-bg-card border border-border-default">
        <div className="p-4 border-b border-border-default">
          <h2 className="text-xl font-bold">All Videos</h2>
        </div>

        <div className="divide-y divide-border-default">
          {videos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="p-4 hover:bg-bg-hover transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Drag Handle */}
                <button className="text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-5 h-5" />
                </button>

                {/* Thumbnail */}
                <div className="w-32 h-18 bg-bg-elevated rounded-lg flex items-center justify-center flex-shrink-0">
                  {video.status === 'ready' ? (
                    <Play className="w-8 h-8 text-accent-cyan" />
                  ) : (
                    getStatusIcon(video.status)
                  )}
                </div>

                {/* Video Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate mb-1">{video.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
                        <span>{video.duration}</span>
                        {video.module && (
                          <>
                            <span>·</span>
                            <span>
                              {video.module} - Week {video.week} - Day {video.day}
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span>Uploaded {video.uploadedAt}</span>
                      </div>
                    </div>
                    {getStatusBadge(video.status)}
                  </div>

                  {video.status === 'ready' && (
                    <div className="flex items-center gap-6 mt-3 text-sm">
                      <div>
                        <span className="text-text-muted">Views:</span>{' '}
                        <span className="font-semibold">{video.views}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Completions:</span>{' '}
                        <span className="font-semibold">{video.completions}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">CHRONOS Multiplier:</span>{' '}
                        <span className="font-semibold text-accent-green">
                          {video.chronosMultiplier}x
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditVideo(video)}
                    disabled={video.status !== 'ready'}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteVideo(video.id)}
                  >
                    <Trash2 className="w-4 h-4 text-accent-red" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {videos.length === 0 && (
          <div className="p-12 text-center">
            <FolderOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted mb-4">No videos uploaded yet</p>
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Your First Video
            </Button>
          </div>
        )}
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Videos"
        size="lg"
      >
        <Tabs
          tabs={[
            { id: 'file', label: 'File Upload', icon: Upload },
            { id: 'youtube', label: 'YouTube', icon: Youtube },
            { id: 'qr', label: 'QR Code', icon: QrCode },
          ]}
          activeTab={uploadMethod}
          onChange={(tab) => setUploadMethod(tab as UploadMethod)}
        />

        <div className="mt-6">
          {uploadMethod === 'file' && (
            <div>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer',
                  isDragging
                    ? 'border-accent-cyan bg-accent-cyan/10'
                    : 'border-border-default hover:border-accent-cyan/50'
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">Drop videos here or click to browse</p>
                <p className="text-sm text-text-muted mb-4">
                  Supports MP4, MOV, AVI (Max 2GB per file)
                </p>
                <Button variant="secondary">Select Files</Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-text-muted mt-4">
                Videos will be automatically organized into modules, weeks, and days based on duration
                (4 hours = 1 day, 5 days = 1 week)
              </p>
            </div>
          )}

          {uploadMethod === 'youtube' && (
            <div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">YouTube Video URL</label>
                  <Input
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <div className="bg-bg-elevated rounded-lg p-4">
                  <p className="text-sm text-text-muted">
                    We'll embed the YouTube video directly, so students can watch without leaving
                    your platform. The video will still be hosted on YouTube.
                  </p>
                </div>
                <Button onClick={handleYoutubeUpload} disabled={!youtubeUrl.trim()} className="w-full">
                  Import Video
                </Button>
              </div>
            </div>
          )}

          {uploadMethod === 'qr' && (
            <div className="text-center">
              <div className="inline-block p-8 bg-white rounded-xl mb-6">
                <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                  <QrCode className="w-24 h-24 text-gray-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Scan to Upload from Mobile</h3>
              <p className="text-text-muted mb-6">
                Use your phone's camera to scan this QR code and upload videos directly from your
                mobile device
              </p>
              <div className="bg-bg-elevated rounded-lg p-4">
                <p className="text-sm text-text-muted">
                  Perfect for recording videos on your phone and uploading them instantly!
                </p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Video Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedVideo(null);
        }}
        title="Edit Video"
      >
        {selectedVideo && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input defaultValue={selectedVideo.title} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CHRONOS Multiplier</label>
              <Input
                type="number"
                min="0.5"
                max="2.0"
                step="0.1"
                defaultValue={selectedVideo.chronosMultiplier}
              />
              <p className="text-xs text-text-muted mt-1">
                Adjust CHRONOS rewards for this video (0.5x - 2.0x). XP remains unchanged.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Module</label>
                <Input defaultValue={selectedVideo.module} placeholder="Module 1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Week</label>
                <Input type="number" defaultValue={selectedVideo.week} placeholder="1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Day</label>
                <Input type="number" defaultValue={selectedVideo.day} placeholder="1" />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedVideo(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Save changes
                  setShowEditModal(false);
                  setSelectedVideo(null);
                }}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
