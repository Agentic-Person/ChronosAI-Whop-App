/**
 * Student Chat Page
 * Split-screen layout with video list, player, and chat interface
 * Now with consistent rounded corners and holographic effects
 */

'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Play, Clock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface Video {
  id: string;
  title: string;
  duration: number; // in seconds
  thumbnail_url?: string;
  video_url?: string;
  url?: string; // Alternative field name
  progress?: number; // 0-100
}

interface Course {
  id: string;
  title: string;
  description?: string;
}

function StudentChatPageContent() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get('course');

  const [videos, setVideos] = useState<Video[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const creatorId = '00000000-0000-0000-0000-000000000001'; // Dev creator ID

  // Fetch course and videos
  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setIsLoading(true);

      // Fetch course details
      const courseResponse = await fetch(`/api/courses?creatorId=${creatorId}`);
      if (!courseResponse.ok) throw new Error('Failed to fetch course');
      const courses = await courseResponse.json();
      const currentCourse = courses.find((c: Course) => c.id === courseId);
      setCourse(currentCourse || null);

      // Fetch videos for this course
      const videosResponse = await fetch(`/api/creator/videos?creatorId=${creatorId}&courseId=${courseId}`);
      if (!videosResponse.ok) throw new Error('Failed to fetch videos');
      const videosData = await videosResponse.json();

      const formattedVideos = videosData.map((v: any) => ({
        id: v.id,
        title: v.title || 'Untitled Video',
        duration: v.duration_seconds || v.duration || 0,
        thumbnail_url: v.thumbnail_url,
        video_url: v.video_url || v.url, // Support both field names
        progress: v.progress || 0, // TODO: Get from progress API
      }));

      setVideos(formattedVideos);

      // Select first video by default
      if (formattedVideos.length > 0 && !selectedVideoId) {
        setSelectedVideoId(formattedVideos[0].id);
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
      toast.error('Failed to load course');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Check if URL is a YouTube video
   */
  const isYouTubeUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  /**
   * Extract YouTube video ID from URL
   */
  const getYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  /**
   * Handle video click from list
   */
  const handleVideoClick = (videoId: string) => {
    setSelectedVideoId(videoId);
  };

  /**
   * Handle video reference click from chat messages
   */
  const handleVideoReferenceClick = (videoId: string, timestamp: number) => {
    setSelectedVideoId(videoId);

    // Seek to timestamp in video player
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = timestamp;
        videoRef.current.play();
      }
    }, 100); // Small delay to ensure video element is ready after state update
  };

  const selectedVideo = videos.find(v => v.id === selectedVideoId) || videos[0];
  const completedVideos = videos.filter(v => (v.progress || 0) === 100).length;

  return (
    <div className="flex flex-col h-screen bg-bg-app overflow-hidden">
      {/* Main Content Area - Two Column Layout */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden max-w-[1800px] mx-auto w-full">
        {/* Left Column - Video List with Holographic Effect */}
        <div className="w-80 flex-shrink-0 relative">
          {/* Holographic glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent rounded-2xl blur-xl" />

          <div className="relative bg-bg-card/90 backdrop-blur-sm border border-indigo-500/40 rounded-2xl overflow-hidden flex flex-col shadow-lg shadow-indigo-500/20" style={{ boxShadow: 'inset 0 2px 4px rgba(99, 102, 241, 0.3), 0 4px 20px rgba(99, 102, 241, 0.2)' }}>
            <div className="px-4 py-3 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-500/20 to-blue-500/10">
              {course && (
                <h3 className="text-sm font-semibold text-text-primary mb-1">{course.title}</h3>
              )}
              <h2 className="text-lg font-bold text-text-primary">Course Videos</h2>
              <p className="text-xs text-text-muted">{completedVideos} of {videos.length} completed</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoading ? (
                <div className="text-center text-text-muted py-8">Loading videos...</div>
              ) : videos.length === 0 ? (
                <div className="text-center text-text-muted py-8">No videos in this course yet</div>
              ) : (
                videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => handleVideoClick(video.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                    selectedVideoId === video.id
                      ? 'bg-gradient-to-br from-indigo-500/25 to-blue-500/15 border border-indigo-500/50 shadow-md shadow-indigo-500/20'
                      : 'bg-bg-elevated/80 border border-border-default/50 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:shadow-sm hover:shadow-indigo-500/10'
                  }`}
                >
                  {/* Thumbnail with rounded corners - YouTube style */}
                  <div className="aspect-video bg-bg-app/50 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden group">
                    {/* Thumbnail Image */}
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500/10 to-blue-500/5" />
                    )}

                    {/* Play Button Overlay - Always visible, YouTube style */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                      <div className="w-14 h-14 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl border-2 border-white/20 group-hover:scale-110 transition-transform">
                        <Play className="w-7 h-7 text-white drop-shadow-lg ml-1" fill="white" />
                      </div>
                    </div>

                    {/* Duration Badge - ALWAYS VISIBLE - Bottom Right, Above Progress Bar */}
                    <div className="absolute bottom-3 right-2 bg-black/95 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white shadow-lg z-10">
                      {formatDuration(video.duration)}
                    </div>

                    {/* Progress Bar - ALWAYS VISIBLE at bottom - Enhanced visibility with green border */}
                    <div className="absolute bottom-0 left-0 right-0 h-3 bg-gray-900/95 border border-green-500/60 flex items-center justify-center">
                      {video.progress > 0 ? (
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300"
                          style={{ width: `${video.progress}%` }}
                        />
                      ) : (
                        /* Show "PROGRESS" text for empty state */
                        <span className="text-[8px] font-semibold text-gray-400/80 uppercase tracking-wider z-10">
                          PROGRESS
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Video Title */}
                  <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                    {video.title}
                  </h3>
                </button>
              )))}
            </div>
          </div>
        </div>

        {/* Right Column - Video Player and Chat */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Video Player with Holographic Effect */}
          <div className="relative">
            {/* Holographic glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0891b2]/10 via-accent-cyan/5 to-transparent rounded-2xl blur-xl" />

            <div className="relative bg-bg-card/90 backdrop-blur-sm border border-[#0891b2]/30 rounded-2xl overflow-hidden shadow-lg shadow-[#0891b2]/10">
              <div className="px-4 py-3 border-b border-[#0891b2]/20 bg-gradient-to-r from-[#0891b2]/15 to-accent-cyan/10">
                <h2 className="text-lg font-bold text-text-primary line-clamp-1">
                  {selectedVideo?.title || 'Select a video'}
                </h2>
                {selectedVideo && selectedVideo.duration > 0 && (
                  <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(selectedVideo.duration)}
                    </span>
                    {(selectedVideo.progress || 0) > 0 && selectedVideo.progress < 100 && (
                      <div className="flex-1 max-w-xs">
                        <div className="h-1.5 bg-bg-app/50 rounded-full">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${selectedVideo.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {selectedVideo.progress === 100 && (
                      <span className="text-accent-green text-xs">Completed</span>
                    )}
                  </div>
                )}
              </div>

              {/* Video Player with rounded corners */}
              <div className="aspect-video bg-bg-app/80 rounded-b-xl overflow-hidden">
                {selectedVideo && (selectedVideo.video_url || selectedVideo.url) ? (
                  isYouTubeUrl(selectedVideo.video_url || selectedVideo.url) ? (
                    /* YouTube Embed Player - No suggested videos */
                    <iframe
                      key={selectedVideoId}
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedVideo.video_url || selectedVideo.url || '')}?rel=0&modestbranding=1`}
                      title={selectedVideo.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    /* HTML5 Video Player for uploaded videos */
                    <video
                      ref={videoRef}
                      key={selectedVideoId}
                      className="w-full h-full"
                      controls
                      controlsList="nodownload"
                      preload="metadata"
                      poster={selectedVideo.thumbnail_url}
                    >
                      <source src={selectedVideo.video_url || selectedVideo.url} type="video/mp4" />
                      <source src={selectedVideo.video_url || selectedVideo.url} type="video/webm" />
                      Your browser does not support the video player.
                    </video>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/30 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                        <Play className="w-10 h-10 text-white drop-shadow-lg" />
                      </div>
                      <p className="text-text-muted">Video not available</p>
                      {selectedVideoId && (
                        <p className="text-sm text-text-muted mt-1">Select a video to start watching</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Interface with Holographic Effect */}
          <div className="flex-1 relative min-h-0">
            {/* Holographic glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent rounded-2xl blur-xl" />

            <div className="relative bg-bg-card/90 backdrop-blur-sm border border-indigo-500/30 rounded-2xl overflow-hidden flex flex-col h-full shadow-lg shadow-indigo-500/10">
              <div className="px-4 py-3 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-500/15 to-blue-500/10">
                <h2 className="text-lg font-bold text-text-primary">Chronos Intelligent Chat</h2>
                <p className="text-sm italic text-text-secondary/70 mt-1">I have memorized every single word from every video, I can answer your questions and locate time stamps in a flash!</p>
              </div>

              <div className="flex-1 min-h-0 rounded-b-xl overflow-hidden">
                <ChatInterface
                  contextType="general"
                  creatorId={creatorId}
                  onVideoClick={handleVideoReferenceClick}
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense to handle useSearchParams
export default function StudentChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-bg-app">
        <div className="text-center">
          <div className="text-lg text-text-primary">Loading...</div>
        </div>
      </div>
    }>
      <StudentChatPageContent />
    </Suspense>
  );
}