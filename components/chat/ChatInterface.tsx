/**
 * Chat Interface Component
 * Main chat UI that integrates all chat components
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ChatMessage } from '@/types/database';
import { ChatResponse, APIResponse } from '@/types/api';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import toast from 'react-hot-toast';
import { showRewardToast } from '@/components/student/RewardNotification';

interface ChatInterfaceProps {
  sessionId?: string;
  contextType?: 'general' | 'project-specific' | 'quiz-help';
  onVideoClick?: (videoId: string, timestamp: number) => void;
  className?: string;
  isFloating?: boolean; // Floating chat widget mode
}

export function ChatInterface({
  sessionId: initialSessionId,
  contextType = 'general',
  onVideoClick,
  className,
  isFloating = false,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(!isFloating);

  // Load message history on mount if sessionId provided
  useEffect(() => {
    if (sessionId) {
      loadHistory(sessionId);
    }
  }, [sessionId]);

  /**
   * Load chat history from API
   */
  const loadHistory = async (sid: string) => {
    try {
      const response = await fetch(`/api/chat/history?session_id=${sid}&limit=50`);
      const data: APIResponse<{ messages: ChatMessage[] }> = await response.json();

      if (data.success && data.data) {
        setMessages(data.data.messages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      toast.error('Failed to load chat history');
    }
  };

  /**
   * Send a message
   */
  const handleSendMessage = async (content: string) => {
    // Add user message to UI immediately (optimistic update)
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId || 'temp',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      // Call chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          session_id: sessionId,
          context_type: contextType,
        }),
      });

      const data: APIResponse<ChatResponse> = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error?.message || 'Failed to send message');
      }

      const chatResponse = data.data;

      // Update session ID if this was the first message
      if (!sessionId) {
        setSessionId(chatResponse.session_id);
      }

      // Add AI response to messages
      const aiMessage: ChatMessage = {
        id: chatResponse.message_id,
        session_id: chatResponse.session_id,
        role: 'assistant',
        content: chatResponse.content,
        video_references: chatResponse.video_references,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => {
        // Remove temp message and add real user + AI messages
        const withoutTemp = prev.filter((m) => m.id !== tempUserMessage.id);
        return [...withoutTemp, tempUserMessage, aiMessage];
      });

      // Show CHRONOS reward notification if tokens were awarded
      if (data.meta?.chronos_awarded) {
        showRewardToast(data.meta.chronos_awarded, 'chat_message');
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');

      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Submit feedback on a message
   */
  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    try {
      const response = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, feedback }),
      });

      const data: APIResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to submit feedback');
      }

      // Update message feedback in UI
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, feedback } : msg
        )
      );

      toast.success('Thanks for your feedback!');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback');
    }
  };

  // Floating widget mode
  if (isFloating) {
    return (
      <>
        {/* Floating Toggle Button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
            aria-label="Open chat"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        )}

        {/* Floating Chat Window */}
        {isOpen && (
          <div className="fixed bottom-6 right-6 z-50 flex flex-col h-[600px] w-[400px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <ChatHeader onClose={() => setIsOpen(false)} />

            {/* Messages */}
            <MessageList
              messages={messages}
              onFeedback={handleFeedback}
              onVideoClick={onVideoClick}
              isLoading={isLoading}
              className="flex-1"
            />

            {/* Input */}
            <MessageInput
              onSend={handleSendMessage}
              disabled={isLoading}
            />
          </div>
        )}
      </>
    );
  }

  // Embedded mode (full width)
  return (
    <div className={cn('flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
      {/* Messages */}
      <MessageList
        messages={messages}
        onFeedback={handleFeedback}
        onVideoClick={onVideoClick}
        isLoading={isLoading}
        className="flex-1"
      />

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={isLoading}
      />
    </div>
  );
}

/**
 * Chat Header Component (for floating mode)
 */
interface ChatHeaderProps {
  onClose: () => void;
}

function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        <h3 className="font-semibold">Course Assistant</h3>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-blue-700 transition-colors"
        aria-label="Close chat"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
