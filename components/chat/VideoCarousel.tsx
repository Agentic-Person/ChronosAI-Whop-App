/**
 * Video Carousel Component
 * Horizontal scrollable carousel showing video thumbnails
 */

'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface Video {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: string;
}

interface VideoCarouselProps {
  videos?: Video[];
  onVideoClick?: (videoId: string) => void;
  className?: string;
}

export function VideoCarousel({
  videos = [],
  onVideoClick,
  className
}: VideoCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll left/right
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 300;
    const currentScroll = scrollContainerRef.current.scrollLeft;
    const targetScroll = direction === 'left'
      ? currentScroll - scrollAmount
      : currentScroll + scrollAmount;

    scrollContainerRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  // Mock videos if none provided
  const displayVideos = videos.length > 0 ? videos : [
    { id: '1', title: 'Introduction to the Course', duration: '12:34' },
    { id: '2', title: 'Getting Started with Basics', duration: '18:22' },
    { id: '3', title: 'Advanced Techniques', duration: '25:10' },
    { id: '4', title: 'Project Overview', duration: '15:45' },
    { id: '5', title: 'Best Practices', duration: '20:30' },
    { id: '6', title: 'Common Mistakes', duration: '14:15' },
    { id: '7', title: 'Final Project', duration: '30:00' },
  ];

  return (
    <div className={cn('relative', className)}>
      {/* Scroll Left Button */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-bg-elevated/90 backdrop-blur-sm border border-border-default rounded-full flex items-center justify-center hover:bg-bg-hover transition-colors"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5 text-text-primary" />
      </button>

      {/* Scroll Right Button */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-bg-elevated/90 backdrop-blur-sm border border-border-default rounded-full flex items-center justify-center hover:bg-bg-hover transition-colors"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5 text-text-primary" />
      </button>

      {/* Video Thumbnails Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-10 py-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayVideos.map((video) => (
          <div
            key={video.id}
            onClick={() => onVideoClick?.(video.id)}
            className="flex-shrink-0 w-48 cursor-pointer group"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-bg-elevated rounded-lg overflow-hidden border border-border-default hover:border-accent-orange transition-all mb-2">
              {/* Placeholder for actual video thumbnail */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-accent-orange/10 rounded-full flex items-center justify-center group-hover:bg-accent-orange/20 transition-colors">
                  <Play className="w-6 h-6 text-accent-orange" />
                </div>
              </div>

              {/* Duration Badge */}
              {video.duration && (
                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs text-white">
                  {video.duration}
                </div>
              )}

              {/* Video Coming Soon Badge (for mock videos without thumbnails) */}
              <div className="absolute top-2 left-2 bg-accent-orange/90 px-2 py-0.5 rounded text-xs text-white font-medium">
                Video
              </div>
            </div>

            {/* Video Title */}
            <h3 className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-accent-orange transition-colors">
              {video.title}
            </h3>
          </div>
        ))}
      </div>
    </div>
  );
}
