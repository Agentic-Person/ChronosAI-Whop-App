/**
 * Message Input Component
 * Text input for chat messages with send button and character counter
 */

'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Ask a question about the course...',
  maxLength = 500,
  className,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed.length === 0 || disabled) return;

    onSend(trimmed);
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);

      // Auto-resize textarea
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
    }
  };

  const characterCount = message.length;
  const isOverLimit = characterCount > maxLength;
  const canSend = message.trim().length > 0 && !disabled && !isOverLimit;

  return (
    <div className={cn('border-t border-gray-200 bg-white p-4', className)}>
      <div className="flex gap-3 items-end">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-500',
              'min-h-[44px] max-h-[150px]'
            )}
          />

          {/* Character Counter */}
          {characterCount > 0 && (
            <div
              className={cn(
                'absolute bottom-2 right-2 text-xs',
                isOverLimit ? 'text-red-500' : 'text-gray-400'
              )}
            >
              {characterCount}/{maxLength}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg transition-all',
            canSend
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
          aria-label="Send message"
        >
          {disabled ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Helper Text */}
      <p className="mt-2 text-xs text-gray-500">
        Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300 font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300 font-mono">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
