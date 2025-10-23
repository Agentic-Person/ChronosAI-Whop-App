'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  Settings,
  MessageSquare,
  X,
  Send,
  ChevronLeft,
  Trophy,
  Coins,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  videoTimestamp?: number;
}

interface RewardNotification {
  type: 'xp' | 'chronos';
  amount: number;
  milestone: number;
}

export default function VideoPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;

  // Get timestamp from URL query parameter (e.g., ?t=123)
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const timestampParam = searchParams.get('t');
  const startTimestamp = timestampParam ? parseInt(timestampParam, 10) : 0;

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTimestamp);
  const [duration, setDuration] = useState(240); // 4 minutes mock
  const [volume, setVolume] = useState(0.8);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // UI state
  const [showChat, setShowChat] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [rewardNotification, setRewardNotification] = useState<RewardNotification | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hi! I'm your AI learning assistant. Ask me anything about this video and I'll help you understand it better. I can also point you to specific timestamps!",
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasInitialSeek = useRef(false);

  // Mock video data
  const video = {
    id: videoId,
    title: 'Introduction to Variables and Data Types',
    module: 'Module 2',
    moduleColor: '#0891b2',
    week: 'Week 1',
    day: 'Day 1',
    duration: '12:34',
    nextVideoId: 'video-2',
  };

  // Progress percentage
  const progress = (currentTime / duration) * 100;

  // Check for milestone rewards
  useEffect(() => {
    const milestones = [25, 50, 75, 100];
    for (const milestone of milestones) {
      if (progress >= milestone && progress < milestone + 1) {
        // Show reward notification
        const chronosAmount = milestone === 100 ? 100 : milestone;
        setRewardNotification({ type: 'chronos', amount: chronosAmount, milestone });
        setTimeout(() => setRewardNotification(null), 5000);
      }
    }
  }, [progress]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls && isPlaying) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response (will be replaced with actual RAG API call)
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Great question! In this video, we cover that topic at [2:15]. Variables are containers for storing data values. You can think of them like labeled boxes where you can put different types of information.`,
        videoTimestamp: 135, // 2:15
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleTimestampClick = (timestamp: number) => {
    setCurrentTime(timestamp);
    setIsPlaying(true);
  };

  const handleNextVideo = () => {
    router.push(`/dashboard/watch/${video.nextVideoId}`);
  };

  // Seek to timestamp on load (from URL parameter)
  useEffect(() => {
    if (startTimestamp > 0 && !hasInitialSeek.current) {
      setCurrentTime(startTimestamp);
      setIsPlaying(true); // Auto-play when navigating from chat reference
      hasInitialSeek.current = true;
    }
  }, [startTimestamp]);

  // Simulate video playback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentTime < duration) {
      interval = setInterval(() => {
        setCurrentTime((prev) => Math.min(prev + 1, duration));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, duration]);

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Breadcrumb Header */}
      <div className="bg-bg-app border-b border-border-default px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="hidden md:flex items-center gap-2 text-sm text-text-muted">
            <span>{video.module}</span>
            <span>›</span>
            <span>{video.week}</span>
            <span>›</span>
            <span>{video.day}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowChat(!showChat)}
          className="lg:hidden"
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Video Player */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {/* Mock Video Display */}
          <div
            className="relative w-full h-full flex items-center justify-center"
            onMouseMove={() => setShowControls(true)}
          >
            {/* Video Content (placeholder) */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-center">
                <Play className="w-24 h-24 text-white/30 mb-4 mx-auto" />
                <p className="text-white/50">Video Player Placeholder</p>
                <p className="text-white/30 text-sm mt-2">{video.title}</p>
              </div>
            </div>

            {/* Center Play Button */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors z-10"
              >
                <div className="w-20 h-20 bg-accent-cyan rounded-full flex items-center justify-center">
                  <Play className="w-10 h-10 text-bg-app ml-1" />
                </div>
              </button>
            )}

            {/* Video Controls */}
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 z-20"
                >
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-cyan"
                    />
                    <div className="flex justify-between text-xs text-white/70 mt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={togglePlay}
                        className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white ml-0.5" />
                        )}
                      </button>

                      <button
                        onClick={handleNextVideo}
                        className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
                      >
                        <SkipForward className="w-5 h-5 text-white" />
                      </button>

                      {/* Volume */}
                      <div className="flex items-center gap-2 group">
                        <button onClick={toggleMute} className="text-white hover:text-accent-cyan">
                          {isMuted || volume === 0 ? (
                            <VolumeX size={20} />
                          ) : (
                            <Volume2 size={20} />
                          )}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>

                      <span className="text-white/70 text-sm">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <button className="text-white hover:text-accent-cyan">
                        <Settings size={20} />
                      </button>
                      <button onClick={toggleFullscreen} className="text-white hover:text-accent-cyan">
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reward Notification */}
            <AnimatePresence>
              {rewardNotification && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 50 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -50 }}
                  className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30"
                >
                  <Card padding="lg" className="bg-bg-elevated border-2 border-accent-green">
                    <div className="flex items-center gap-4">
                      {rewardNotification.type === 'chronos' ? (
                        <Coins className="w-10 h-10 text-accent-green" />
                      ) : (
                        <Trophy className="w-10 h-10 text-accent-yellow" />
                      )}
                      <div>
                        <p className="text-xl font-bold">
                          +{rewardNotification.amount}{' '}
                          {rewardNotification.type === 'chronos' ? 'CHRONOS' : 'XP'}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {rewardNotification.milestone}% Milestone Reached!
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* AI Chat Sidebar */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="w-full lg:w-96 bg-bg-app border-l border-border-default flex flex-col"
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-border-default flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-bg-app" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Assistant</h3>
                    <p className="text-xs text-text-muted">Ask about the video</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(false)}
                  className="lg:hidden"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg p-3',
                        message.role === 'user'
                          ? 'bg-accent-cyan text-bg-app'
                          : 'bg-bg-card border border-border-default'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.videoTimestamp !== undefined && (
                        <button
                          onClick={() => handleTimestampClick(message.videoTimestamp!)}
                          className="mt-2 text-xs text-accent-cyan hover:underline"
                        >
                          Jump to {formatTime(message.videoTimestamp)}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-bg-card border border-border-default rounded-lg p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-text-muted rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        />
                        <div
                          className="w-2 h-2 bg-text-muted rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border-default">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about the video..."
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
