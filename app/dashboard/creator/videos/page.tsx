'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  QrCode,
  Play,
  Trash2,
  Edit2,
  Check,
  Clock,
  AlertCircle,
  GripVertical,
  Youtube,
  FolderOpen,
  Layers,
  Video as VideoIcon,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { QRCodeCanvas } from 'qrcode.react';
import { CourseCard } from '@/components/creator/CourseCard';
import { AddCourseModal } from '@/components/creator/AddCourseModal';
import { CourseSelector } from '@/components/creator/CourseSelector';
import toast from 'react-hot-toast';

type UploadMethod = 'file' | 'youtube' | 'qr';
type VideoStatus = 'processing' | 'ready' | 'error';
type ViewMode = 'courses' | 'all-videos' | 'course-detail';

interface Course {
  id: string;
  title: string;
  description?: string;
  video_count: number;
  total_duration: number;
  thumbnail_url?: string;
}

interface Video {
  id: string;
  title: string;
  duration: string;
  thumbnail?: string;
  status: VideoStatus;
  uploadedAt: string;
  course_id?: string;
  views: number;
  completions: number;
}

export default function CreatorVideosPage() {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('courses');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Upload state
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('file');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedUploadCourseId, setSelectedUploadCourseId] = useState<string>('');
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>(['']);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSessionUrl, setUploadSessionUrl] = useState<string>('');
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);

  // Edit state
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);

  // Data state
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);

  // Upload queue
  const [uploadQueue, setUploadQueue] = useState<any[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const creatorId = '00000000-0000-0000-0000-000000000001'; // Dev creator ID

  // Fetch courses on mount
  useEffect(() => {
    fetchCourses();
    fetchVideos();
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoadingCourses(true);
      const response = await fetch(`/api/courses?creatorId=${creatorId}`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const fetchVideos = async (courseId?: string) => {
    try {
      setIsLoadingVideos(true);
      let url = `/api/creator/videos?creatorId=${creatorId}`;
      if (courseId) url += `&courseId=${courseId}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data = await response.json();

      // Transform database format to component format
      const transformedVideos: Video[] = data.map((v: any) => {
        let status: VideoStatus = 'ready';
        if (v.status === 'failed') status = 'error';
        else if (v.status === 'processing') status = 'processing';

        return {
          id: v.id,
          title: v.title,
          duration: formatDuration(v.duration_seconds),
          thumbnail: v.thumbnail_url,
          status,
          uploadedAt: new Date(v.created_at).toISOString().split('T')[0],
          course_id: v.course_id,
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

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate upload session for QR code
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
      let origin = window.location.origin;
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        const localIP = '192.168.40.32'; // TODO: Make configurable
        origin = `http://${localIP}:3008`;
      }

      const url = `${origin}/upload/mobile?token=${sessionToken}&courseId=${selectedUploadCourseId}`;
      setUploadSessionUrl(url);
      setSessionExpiry(new Date(expiresAt));
    } catch (error) {
      console.error('Failed to create upload session:', error);
    }
  };

  // File handling
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
    if (!selectedUploadCourseId) {
      toast.error('Please select a course first');
      return;
    }

    console.log('Uploading files to course:', selectedUploadCourseId);
    setShowUploadModal(false);

    // Add files to queue
    const queueItems = files.map(file => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      type: 'file',
      file,
      courseId: selectedUploadCourseId,
      status: 'pending',
    }));

    setUploadQueue(prev => [...prev, ...queueItems]);
    processQueue();
  };

  // YouTube handling
  const handleYoutubeUpload = async () => {
    if (!selectedUploadCourseId) {
      toast.error('Please select a course first');
      return;
    }

    const validUrls = youtubeUrls.filter(url => url.trim());
    if (validUrls.length === 0) {
      toast.error('Please enter at least one YouTube URL');
      return;
    }

    setShowUploadModal(false);

    // Add URLs to queue
    const queueItems = validUrls.map(url => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      type: 'youtube',
      url,
      courseId: selectedUploadCourseId,
      status: 'pending',
    }));

    setUploadQueue(prev => [...prev, ...queueItems]);
    processQueue();
    setYoutubeUrls(['']);
  };

  // Process upload queue
  const processQueue = async () => {
    if (isProcessingQueue) return;
    setIsProcessingQueue(true);

    while (uploadQueue.length > 0) {
      const item = uploadQueue[0];
      if (item.status === 'pending') {
        // Update status to processing
        setUploadQueue(prev =>
          prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i)
        );

        try {
          if (item.type === 'file') {
            await uploadFile(item.file, item.courseId);
          } else if (item.type === 'youtube') {
            await importYouTube(item.url, item.courseId);
          }

          // Mark as completed and remove from queue
          setUploadQueue(prev => prev.filter(i => i.id !== item.id));
        } catch (error) {
          console.error('Queue processing error:', error);
          // Mark as failed
          setUploadQueue(prev =>
            prev.map(i => i.id === item.id ? { ...i, status: 'failed' } : i)
          );
        }
      }
    }

    setIsProcessingQueue(false);
    fetchVideos(selectedCourse?.id);
    fetchCourses(); // Refresh course stats
  };

  const uploadFile = async (file: File, courseId: string) => {
    // Existing file upload logic with courseId
    const tempId = `temp-${Date.now()}`;
    const newVideo: Video = {
      id: tempId,
      title: file.name.replace(/\.[^/.]+$/, ''),
      duration: '0:00',
      status: 'processing',
      uploadedAt: new Date().toISOString().split('T')[0],
      course_id: courseId,
      views: 0,
      completions: 0,
    };
    setVideos(prev => [newVideo, ...prev]);

    try {
      const uploadUrlResponse = await fetch('/api/video/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!uploadUrlResponse.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, videoId } = await uploadUrlResponse.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload file');

      const confirmResponse = await fetch('/api/video/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, courseId }),
      });

      if (!confirmResponse.ok) throw new Error('Failed to confirm upload');
      const { video } = await confirmResponse.json();

      setVideos(prev =>
        prev.map(v =>
          v.id === tempId
            ? { ...v, id: video.id, status: video.processingStatus || 'processing' }
            : v
        )
      );
    } catch (error) {
      console.error('Upload failed:', error);
      setVideos(prev =>
        prev.map(v => v.id === tempId ? { ...v, status: 'error' } : v)
      );
      throw error;
    }
  };

  const importYouTube = async (url: string, courseId: string) => {
    const response = await fetch('/api/video/youtube-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeUrl: url, courseId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to import video');
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const response = await fetch(`/api/video/delete?id=${videoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete video');

      setVideos(prev => prev.filter(v => v.id !== videoId));
      fetchCourses(); // Update course stats
      toast.success('Video deleted successfully');
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setViewMode('course-detail');
    fetchVideos(course.id);
  };

  const handleAddVideosClick = (course: Course) => {
    setSelectedCourse(course);
    setSelectedUploadCourseId(course.id);
    setShowUploadModal(true);
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
        return <Badge variant="success">Ready</Badge>;
      case 'processing':
        return <Badge variant="warning">Processing</Badge>;
      case 'error':
        return <Badge variant="error">Error</Badge>;
    }
  };

  // Calculate stats
  const stats = {
    totalCourses: courses.length,
    totalVideos: videos.length,
    processingCount: uploadQueue.filter(i => i.status === 'processing').length +
                    videos.filter(v => v.status === 'processing').length,
    queueCount: uploadQueue.length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Compact Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            {viewMode === 'course-detail' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setViewMode('courses');
                  setSelectedCourse(null);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">
                  {viewMode === 'course-detail'
                    ? selectedCourse?.title
                    : 'Video Management'}
                </h1>
                {/* Inline Stats */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 px-2 py-1 bg-bg-card rounded-md border border-border-default">
                    <span className="text-text-muted">Courses:</span>
                    <span className="font-semibold">{stats.totalCourses}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-bg-card rounded-md border border-border-default">
                    <span className="text-text-muted">Videos:</span>
                    <span className="font-semibold">{stats.totalVideos}</span>
                  </div>
                  {stats.processingCount > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-accent-yellow/10 rounded-md border border-accent-yellow/30">
                      <span className="text-text-muted">Processing:</span>
                      <span className="font-semibold text-accent-yellow">{stats.processingCount}</span>
                    </div>
                  )}
                  {stats.queueCount > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-accent-orange/10 rounded-md border border-accent-orange/30">
                      <span className="text-text-muted">Queue:</span>
                      <span className="font-semibold text-accent-orange">{stats.queueCount}</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-text-secondary text-sm mt-1">
                {viewMode === 'course-detail'
                  ? selectedCourse?.description || 'Manage videos in this course'
                  : 'Organize your content into courses and manage videos'}
              </p>
            </div>
          </div>

          {(viewMode === 'courses' || viewMode === 'course-detail') && (
            <Button
              size="sm"
              onClick={() => {
                if (viewMode === 'course-detail' && selectedCourse) {
                  setSelectedUploadCourseId(selectedCourse.id);
                }
                setShowUploadModal(true);
              }}
            >
              <Upload className="w-3 h-3 mr-1" />
              {viewMode === 'course-detail' ? 'Add Videos' : 'Upload'}
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      {viewMode !== 'course-detail' && (
        <div className="flex gap-2 mb-6 p-1 bg-bg-elevated rounded-lg w-fit">
          <button
            onClick={() => setViewMode('courses')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              viewMode === 'courses'
                ? 'bg-bg-app text-text-primary shadow-md'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <Layers className="w-4 h-4" />
            Courses
          </button>
          <button
            onClick={() => setViewMode('all-videos')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              viewMode === 'all-videos'
                ? 'bg-bg-app text-text-primary shadow-md'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <VideoIcon className="w-4 h-4" />
            All Videos
          </button>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              description={course.description}
              videoCount={course.video_count}
              totalDuration={course.total_duration}
              thumbnailUrl={course.thumbnail_url}
              onClick={() => handleCourseClick(course)}
              onEdit={() => {/* TODO: Implement edit */}}
              onDelete={() => {/* TODO: Implement delete */}}
            />
          ))}

          {/* Add Course Card */}
          <CourseCard
            isAddCard
            title=""
            videoCount={0}
            totalDuration={0}
            onClick={() => setShowAddCourseModal(true)}
          />
        </div>
      )}

      {(viewMode === 'all-videos' || viewMode === 'course-detail') && (
        <Card padding="none" className="bg-bg-card border border-border-default">
          <div className="p-4 border-b border-border-default">
            <h2 className="text-xl font-bold">
              {viewMode === 'course-detail'
                ? `Videos in ${selectedCourse?.title}`
                : 'All Videos'}
            </h2>
          </div>

          <div className="divide-y divide-border-default">
            {videos
              .filter(v => viewMode === 'all-videos' || v.course_id === selectedCourse?.id)
              .map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="p-4 hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <button className="text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-5 h-5" />
                    </button>

                    <div className="w-32 h-18 bg-bg-elevated rounded-lg flex items-center justify-center flex-shrink-0">
                      {video.status === 'ready' ? (
                        <Play className="w-8 h-8 text-accent-cyan" />
                      ) : (
                        getStatusIcon(video.status)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate mb-1">{video.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
                            <span>{video.duration}</span>
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

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {/* TODO: Implement edit */}}
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

          {videos.filter(v => viewMode === 'all-videos' || v.course_id === selectedCourse?.id).length === 0 && (
            <div className="p-12 text-center">
              <FolderOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted mb-4">No videos in this {viewMode === 'course-detail' ? 'course' : 'collection'} yet</p>
              <Button onClick={() => {
                if (viewMode === 'course-detail' && selectedCourse) {
                  setSelectedUploadCourseId(selectedCourse.id);
                }
                setShowUploadModal(true);
              }}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Video
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Upload Modal with Course Selection */}
      <Modal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Videos"
        size="lg"
      >
        <div className="space-y-6">
          {/* Course Selection */}
          <CourseSelector
            courses={courses}
            selectedCourseId={selectedUploadCourseId}
            onChange={setSelectedUploadCourseId}
          />

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
                  <p className="text-sm text-accent-green mb-4">
                    You can select multiple files at once!
                  </p>
                  <Button variant="secondary" disabled={!selectedUploadCourseId}>
                    Select Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="video/mp4,video/quicktime,video/mpeg,video/webm"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {uploadMethod === 'youtube' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {youtubeUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={url}
                        onChange={(e) => {
                          const newUrls = [...youtubeUrls];
                          newUrls[index] = e.target.value;
                          setYoutubeUrls(newUrls);
                        }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        disabled={!selectedUploadCourseId}
                      />
                      {youtubeUrls.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setYoutubeUrls(youtubeUrls.filter((_, i) => i !== index));
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  variant="secondary"
                  onClick={() => setYoutubeUrls([...youtubeUrls, ''])}
                  className="w-full"
                  disabled={!selectedUploadCourseId}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another URL
                </Button>

                <div className="bg-bg-elevated rounded-lg p-4">
                  <p className="text-sm text-text-muted">
                    Add multiple YouTube videos at once! They'll be processed in sequence and added to your selected course.
                  </p>
                </div>

                <Button
                  onClick={handleYoutubeUpload}
                  disabled={!selectedUploadCourseId || youtubeUrls.every(u => !u.trim())}
                  className="w-full"
                >
                  Import {youtubeUrls.filter(u => u.trim()).length} Video(s)
                </Button>
              </div>
            )}

            {uploadMethod === 'qr' && (
              <div className="text-center">
                <div className="inline-block p-8 bg-white rounded-xl mb-6">
                  {uploadSessionUrl && selectedUploadCourseId ? (
                    <QRCodeCanvas value={uploadSessionUrl} size={192} level="H" />
                  ) : (
                    <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500 text-sm px-4">
                        {!selectedUploadCourseId
                          ? 'Select a course first'
                          : 'Generating QR code...'}
                      </p>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">Scan to Upload from Mobile</h3>
                <p className="text-text-muted mb-4">
                  Use your phone's camera to scan this QR code
                </p>
                {sessionExpiry && (
                  <p className="text-sm text-accent-yellow mb-4">
                    Session expires in {Math.round((sessionExpiry.getTime() - Date.now()) / 60000)} minutes
                  </p>
                )}
                <Button
                  variant="secondary"
                  onClick={generateUploadSession}
                  className="mb-4"
                  disabled={!selectedUploadCourseId}
                >
                  Generate New Code
                </Button>
              </div>
            )}
          </div>

          {/* Upload Queue Display */}
          {uploadQueue.length > 0 && (
            <div className="border-t border-border-default pt-4">
              <h3 className="text-sm font-medium mb-2">Upload Queue ({uploadQueue.length})</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uploadQueue.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">
                      {item.file?.name || item.url}
                    </span>
                    <Badge variant={
                      item.status === 'processing' ? 'warning' :
                      item.status === 'failed' ? 'error' :
                      'default'
                    }>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Add Course Modal */}
      <AddCourseModal
        open={showAddCourseModal}
        onClose={() => setShowAddCourseModal(false)}
        onSuccess={(course) => {
          setCourses(prev => [...prev, course]);
          setShowAddCourseModal(false);
        }}
        creatorId={creatorId}
      />
    </div>
  );
}