'use client';

import React, { useState, useRef, useEffect } from 'react';
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
import { cn } from '@/lib/utils';
import { QRCodeCanvas } from 'qrcode.react';

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
  // TODO: Re-enable for post-MVP Chronos token feature
  // chronosMultiplier?: number;
}

export default function CreatorVideosPage() {
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('file');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadSessionUrl, setUploadSessionUrl] = useState<string>('');
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Videos loaded from database
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);

  // Fetch videos from database on mount
  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setIsLoadingVideos(true);
      // Using dev creator ID - replace with real auth later
      const creatorId = '00000000-0000-0000-0000-000000000001';
      const response = await fetch(`/api/creator/videos?creatorId=${creatorId}`);

      if (!response.ok) throw new Error('Failed to fetch videos');

      const data = await response.json();

      console.log('=== FETCHED VIDEOS FROM API ===');
      console.log('Raw data:', data);
      console.log('Data length:', data.length);
      console.log('First video:', data[0]);

      // Transform database format to component format
      const transformedVideos: Video[] = data.map((v: any) => {
        // Map database status to component status types
        let status: VideoStatus = 'ready';
        if (v.status === 'failed') {
          status = 'error';
        } else if (v.status === 'processing') {
          status = 'processing';
        } else {
          // 'pending', 'completed', or any other status = show as 'ready'
          status = 'ready';
        }

        return {
          id: v.id,
          title: v.title,
          duration: formatDuration(v.duration_seconds),
          thumbnail: v.thumbnail_url,
          status,
          uploadedAt: new Date(v.created_at).toISOString().split('T')[0],
          views: v.views || 0,
          completions: v.completions || 0,
        };
      });

      setVideos(transformedVideos);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Helper to format duration in seconds to MM:SS
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  // Generate upload session when QR tab is opened
  useEffect(() => {
    if (uploadMethod === 'qr' && !uploadSessionUrl) {
      generateUploadSession();
    }
  }, [uploadMethod]);

  const generateUploadSession = async () => {
    try {
      const response = await fetch('/api/upload/session/create', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to create upload session');

      const { sessionToken, expiresAt } = await response.json();

      // Replace localhost with local network IP for mobile access
      let origin = window.location.origin;
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        // Use local network IP instead of localhost for QR code
        // Users should access the site via their local IP for mobile uploads to work
        const localIP = '192.168.40.32'; // TODO: Make this configurable or auto-detect
        origin = `http://${localIP}:3008`;
      }

      const url = `${origin}/upload/mobile?token=${sessionToken}`;
      setUploadSessionUrl(url);
      setSessionExpiry(new Date(expiresAt));
    } catch (error) {
      console.error('Failed to create upload session:', error);
    }
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

  const handleFileUpload = async (files: File[]) => {
    console.log('Uploading files:', files);
    setShowUploadModal(false);

    // Upload each file
    for (const file of files) {
      // Add to UI immediately with processing status
      const tempId = `temp-${Date.now()}`;
      const newVideo: Video = {
        id: tempId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        duration: '0:00',
        status: 'processing',
        uploadedAt: new Date().toISOString().split('T')[0],
        views: 0,
        completions: 0,
      };
      setVideos((prev) => [newVideo, ...prev]);

      try {
        // Step 1: Get upload URL
        const uploadUrlResponse = await fetch('/api/video/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
          }),
        });

        if (!uploadUrlResponse.ok) {
          throw new Error('Failed to get upload URL');
        }

        const { uploadUrl, videoId } = await uploadUrlResponse.json();

        // Step 2: Upload file to Supabase storage
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file');
        }

        // Step 3: Confirm upload (starts processing)
        const confirmResponse = await fetch('/api/video/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId }),
        });

        if (!confirmResponse.ok) {
          throw new Error('Failed to confirm upload');
        }

        const { video } = await confirmResponse.json();

        // Update video in list with real ID
        setVideos((prev) =>
          prev.map((v) =>
            v.id === tempId
              ? { ...v, id: video.id, status: video.processingStatus || 'processing' }
              : v
          )
        );

        console.log('Upload successful:', video);
      } catch (error) {
        console.error('Upload failed:', error);
        // Mark as error in UI
        setVideos((prev) =>
          prev.map((v) => (v.id === tempId ? { ...v, status: 'error' as VideoStatus } : v))
        );
      }
    }
  };

  const handleYoutubeUpload = async () => {
    if (!youtubeUrl.trim()) return;

    // Add temporary video to UI while importing
    const tempId = `temp-${Date.now()}`;
    const tempVideo: Video = {
      id: tempId,
      title: 'Importing from YouTube...',
      duration: '0:00',
      status: 'processing',
      uploadedAt: new Date().toISOString().split('T')[0],
      views: 0,
      completions: 0,
    };
    setVideos((prev) => [tempVideo, ...prev]);

    try {
      const response = await fetch('/api/video/youtube-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import video');
      }

      const video = await response.json();

      // Refresh video list from database to get latest data
      await fetchVideos();

      setYoutubeUrl('');
      setShowUploadModal(false);
    } catch (error) {
      console.error('YouTube import failed:', error);
      // Mark as error in UI
      setVideos((prev) =>
        prev.map((v) =>
          v.id === tempId
            ? {
                ...v,
                status: 'error' as VideoStatus,
                title: error instanceof Error ? error.message : 'Import failed',
              }
            : v
        )
      );
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/video/delete?id=${videoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete video');
      }

      // Remove from UI after successful deletion
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      toast.success('Video deleted successfully');
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
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
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Videos"
        size="lg"
      >
        <div className="space-y-6">
          {/* Tab Buttons */}
          <div className="flex gap-2 p-1 bg-bg-elevated rounded-lg">
            <button
              onClick={() => setUploadMethod('file')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                uploadMethod === 'file'
                  ? 'bg-bg-app text-text-primary shadow-md'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Upload className="w-4 h-4" />
              File Upload
            </button>
            <button
              onClick={() => setUploadMethod('youtube')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                uploadMethod === 'youtube'
                  ? 'bg-bg-app text-text-primary shadow-md'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Youtube className="w-4 h-4" />
              YouTube
            </button>
            <button
              onClick={() => setUploadMethod('qr')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                uploadMethod === 'qr'
                  ? 'bg-bg-app text-text-primary shadow-md'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {uploadMethod === 'file' && (
              <div>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer',
                    isDragging
                      ? 'border-accent-orange bg-accent-orange/10'
                      : 'border-border-default hover:border-accent-orange/50'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-16 h-16 text-text-muted mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">Drop videos here or click to browse</p>
                  <p className="text-sm text-text-muted mb-4">
                    Supports MP4, MOV, MPEG, WEBM (Max 4GB per file)
                  </p>
                  <Button variant="secondary">Select Files</Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="video/mp4,video/quicktime,video/mpeg,video/webm"
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
                  {uploadSessionUrl ? (
                    <QRCodeCanvas value={uploadSessionUrl} size={192} level="H" />
                  ) : (
                    <div className="w-48 h-48 animate-pulse bg-gray-200 rounded-lg flex items-center justify-center">
                      <QrCode className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">Scan to Upload from Mobile</h3>
                <p className="text-text-muted mb-4">
                  Use your phone's camera to scan this QR code
                </p>
                {sessionExpiry && (
                  <p className="text-sm text-accent-yellow mb-4">
                    Session expires in {Math.round((sessionExpiry.getTime() - Date.now()) / 60000)}{' '}
                    minutes
                  </p>
                )}
                <Button variant="secondary" onClick={generateUploadSession} className="mb-4">
                  Generate New Code
                </Button>
                <div className="bg-bg-elevated rounded-lg p-4">
                  <p className="text-sm text-text-muted">
                    Perfect for recording videos on your phone and uploading them instantly! Recommended
                    file size: under 100MB for faster mobile uploads.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Video Modal */}
      <Modal
        open={showEditModal}
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
