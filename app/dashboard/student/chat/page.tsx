/**
 * Student Chat Page
 * Clean ChatGPT-style interface with video carousel
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { VideoCarousel } from '@/components/chat/VideoCarousel';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { MessageCircle, Sparkles } from 'lucide-react';

export default function StudentChatPage() {
  const router = useRouter();

  /**
   * Handle video click from carousel
   */
  const handleVideoClick = (videoId: string) => {
    // Navigate to video player
    router.push(`/dashboard/watch/${videoId}`);
  };

  /**
   * Handle video reference click from chat messages
   */
  const handleVideoReferenceClick = (videoId: string, timestamp: number) => {
    // Navigate to video player with timestamp
    router.push(`/dashboard/watch/${videoId}?t=${timestamp}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-bg-app">
      {/* Video Carousel Section */}
      <div className="border-b border-border-default bg-bg-card py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-3 px-10">
            <Sparkles className="w-5 h-5 text-accent-orange" />
            <h2 className="text-sm font-semibold text-text-primary">
              Course Videos
            </h2>
          </div>
          <VideoCarousel onVideoClick={handleVideoClick} />
        </div>
      </div>

      {/* Chat Interface - Takes remaining height */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-border-default">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-md">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-text-primary">
                  Course Assistant
                </h1>
                <p className="text-sm text-text-secondary">
                  Ask me anything about the course videos
                </p>
              </div>
            </div>
          </div>

          {/* Chat Messages and Input */}
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
  );
}