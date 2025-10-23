/**
 * Student Chat Page
 * Main chat interface for students to ask questions about course content
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { SessionSidebar } from '@/components/chat/SessionSidebar';
import { CreatorSelector } from '@/components/chat/CreatorSelector';
import { MessageCircle, Menu, X } from 'lucide-react';
import { ChatSession } from '@/types/database';
import toast from 'react-hot-toast';

export default function StudentChatPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load chat sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  /**
   * Load all chat sessions for the student
   */
  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/chat');
      const data = await response.json();

      if (data.success && data.data?.sessions) {
        setSessions(data.data.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast.error('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle session selection
   */
  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  /**
   * Handle new chat
   */
  const handleNewChat = () => {
    setCurrentSessionId(undefined);
  };

  /**
   * Handle session deletion
   */
  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/session/${sessionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to delete session');
      }

      // Remove from list
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      // Clear current session if it was deleted
      if (currentSessionId === sessionId) {
        setCurrentSessionId(undefined);
      }

      toast.success('Chat deleted');
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete chat');
    }
  };

  /**
   * Handle video reference click
   */
  const handleVideoClick = (videoId: string, timestamp: number) => {
    // Navigate to video player with timestamp
    router.push(`/dashboard/watch/${videoId}?t=${timestamp}`);
  };

  /**
   * Handle creator selection (for multi-tenant support)
   */
  const handleCreatorChange = (creatorId: string) => {
    setSelectedCreatorId(creatorId);
    // Filter sessions by creator
    setCurrentSessionId(undefined);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-20 left-4 z-50 lg:hidden p-2 rounded-lg bg-white shadow-lg border border-gray-200 hover:bg-gray-50"
        aria-label="Toggle sidebar"
      >
        {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Session Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-80 lg:w-80 xl:w-96
          transform transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          isLoading={isLoading}
        />
      </div>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Course Assistant
                </h1>
                <p className="text-sm text-gray-600">
                  Ask me anything about the course videos
                </p>
              </div>
            </div>

            {/* Creator Selector (for students enrolled with multiple creators) */}
            {/* <CreatorSelector
              selectedCreatorId={selectedCreatorId}
              onCreatorChange={handleCreatorChange}
            /> */}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 min-h-0">
          <ChatInterface
            sessionId={currentSessionId}
            contextType="general"
            onVideoClick={handleVideoClick}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
