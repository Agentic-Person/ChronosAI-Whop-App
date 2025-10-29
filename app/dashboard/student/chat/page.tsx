/**
 * Student Chat Page
 * Split-screen layout with video list, player, and chat interface
 */

'use client';

import React, { useState } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Play, Clock } from 'lucide-react';

// Mock video data - will be replaced with API
const mockVideos = [
  { id: '1', title: 'Introduction to the Course', duration: '12:34', progress: 100 },
  { id: '2', title: 'Getting Started with Basics', duration: '18:22', progress: 75 },
  { id: '3', title: 'Advanced Techniques', duration: '25:10', progress: 45 },
  { id: '4', title: 'Project Overview', duration: '15:45', progress: 0 },
  { id: '5', title: 'Best Practices', duration: '20:30', progress: 0 },
  { id: '6', title: 'Common Mistakes to Avoid', duration: '14:15', progress: 0 },
  { id: '7', title: 'Real-world Applications', duration: '22:45', progress: 0 },
  { id: '8', title: 'Final Project Walkthrough', duration: '30:00', progress: 0 },
];

// Mock stats - will be replaced with API
const mockStats = {
  totalVideos: 48,
  completedVideos: 12,
  currentStreak: 7,
  totalXP: 2450,
};

export default function StudentChatPage() {
  const [selectedVideoId, setSelectedVideoId] = useState<string>('2');

  /**
   * Handle video click from list
   */
  const handleVideoClick = (videoId: string) => {
    setSelectedVideoId(videoId);
  };

  /**
   * Handle video reference click from chat messages
   */
  const handleVideoReferenceClick = (videoId: string, _timestamp: number) => {
    setSelectedVideoId(videoId);
    // TODO: Seek to timestamp in video player
  };

  const selectedVideo = mockVideos.find(v => v.id === selectedVideoId) || mockVideos[0];

  return (
    <div className="flex flex-col h-screen bg-bg-app overflow-hidden">
      {/* Main Content Area - Two Column Layout */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden max-w-[1800px] mx-auto w-full">
        {/* Left Column - Video List (Yellow) */}
        <div className="w-80 flex-shrink-0 bg-accent-yellow/5 border-2 border-accent-yellow/30 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-accent-yellow/30 bg-accent-yellow/10">
            <h2 className="text-lg font-bold text-text-primary">Course Videos</h2>
            <p className="text-xs text-text-muted">{mockStats.completedVideos} of {mockStats.totalVideos} completed</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {mockVideos.map((video) => (
              <button
                key={video.id}
                onClick={() => handleVideoClick(video.id)}
                className={`w-full text-left p-3 rounded-lg transition-all border-2 ${
                  selectedVideoId === video.id
                    ? 'bg-accent-yellow/20 border-accent-yellow/50'
                    : 'bg-bg-card border-border-default hover:border-accent-yellow/30 hover:bg-accent-yellow/10'
                }`}
              >
                {/* Thumbnail Placeholder */}
                <div className="aspect-video bg-bg-elevated rounded-md mb-2 flex items-center justify-center relative overflow-hidden">
                  <div className="w-10 h-10 bg-accent-orange/20 rounded-full flex items-center justify-center">
                    <Play className="w-5 h-5 text-accent-orange" />
                  </div>
                  {/* Duration Badge */}
                  <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-xs text-white">
                    {video.duration}
                  </div>
                  {/* Progress Bar */}
                  {video.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg-app/50">
                      <div
                        className="h-full bg-accent-orange"
                        style={{ width: `${video.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Video Title */}
                <h3 className="text-sm font-semibold text-text-primary line-clamp-2 mb-1">
                  {video.title}
                </h3>

                {/* Progress Info */}
                {video.progress > 0 && (
                  <p className="text-xs text-accent-green">
                    {video.progress}% complete
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column - Video Player and Chat */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Video Player (Blue) */}
          <div className="bg-accent-cyan/5 border-2 border-[#0891b2]/30 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#0891b2]/30 bg-[#0891b2]/10">
              <h2 className="text-lg font-bold text-text-primary line-clamp-1">{selectedVideo.title}</h2>
              <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedVideo.duration}
                </span>
                {selectedVideo.progress > 0 && (
                  <span className="text-accent-green">
                    {selectedVideo.progress}% complete
                  </span>
                )}
              </div>
            </div>

            {/* Video Player Placeholder */}
            <div className="aspect-video bg-bg-app flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-accent-orange/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-10 h-10 text-accent-orange" />
                </div>
                <p className="text-text-muted">Video Player Placeholder</p>
                <p className="text-sm text-text-muted mt-1">Video ID: {selectedVideoId}</p>
              </div>
            </div>
          </div>

          {/* Chat Interface (Purple) */}
          <div className="flex-1 bg-accent-purple/5 border-2 border-accent-purple/30 rounded-xl overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-accent-purple/30 bg-accent-purple/10">
              <h2 className="text-lg font-bold text-text-primary">AI Course Assistant</h2>
              <p className="text-xs text-text-muted">Ask questions about the course videos</p>
            </div>

            <div className="flex-1 min-h-0">
              <ChatInterface
                contextType="general"
                onVideoClick={handleVideoReferenceClick}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}