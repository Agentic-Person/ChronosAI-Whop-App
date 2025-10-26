/**
 * Session Sidebar Component
 * Displays list of chat sessions with search and management
 */

'use client';

import React, { useState } from 'react';
import { ChatSession } from '@/types/database';
import { formatRelativeTime } from '@/lib/utils/helpers';
import {
  MessageCircle,
  Plus,
  Search,
  Trash2,
  MoreVertical,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface SessionSidebarProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  isLoading?: boolean;
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isLoading = false,
}: SessionSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filter sessions by search query
  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group sessions by date
  const groupedSessions = groupSessionsByDate(filteredSessions);

  return (
    <div className="h-full bg-bg-sidebar border-r border-border-default flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border-default">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-all font-medium shadow-md"
        >
          <Plus className="h-5 w-5" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border-default">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-bg-elevated border border-border-default text-text-primary placeholder-text-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-orange/20 focus:border-accent-orange"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LoadingSkeleton />
        ) : filteredSessions.length === 0 ? (
          <EmptyState hasSearch={searchQuery.length > 0} />
        ) : (
          <div className="p-2">
            {Object.entries(groupedSessions).map(([dateLabel, groupSessions]) => (
              <div key={dateLabel} className="mb-4">
                <h3 className="px-3 mb-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
                  {dateLabel}
                </h3>
                <div className="space-y-1">
                  {groupSessions.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === currentSessionId}
                      onSelect={() => onSelectSession(session.id)}
                      onDelete={() => onDeleteSession(session.id)}
                      isMenuOpen={activeMenuId === session.id}
                      onMenuToggle={() => setActiveMenuId(activeMenuId === session.id ? null : session.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-border-default bg-bg-card">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{sessions.length} conversations</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Last 30 days
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual Session Item
 */
interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  isMenuOpen,
  onMenuToggle,
}: SessionItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMenuToggle();
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-all',
        isActive
          ? 'bg-accent-orange/10 text-text-primary'
          : 'hover:bg-bg-hover text-text-secondary'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
        isActive ? 'bg-accent-orange/20 text-accent-orange' : 'bg-bg-elevated text-text-muted'
      )}>
        <MessageCircle className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          'text-sm font-medium truncate',
          isActive ? 'text-text-primary' : 'text-text-primary'
        )}>
          {session.title}
        </h4>
        <p className={cn(
          'text-xs truncate',
          isActive ? 'text-accent-orange' : 'text-text-muted'
        )}>
          {formatRelativeTime(session.updated_at)}
        </p>
      </div>

      {/* Menu Button */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleMenuClick}
          className="p-1 rounded hover:bg-bg-elevated transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="h-4 w-4 text-text-muted" />
        </button>
      </div>

      {/* Delete Menu */}
      {isMenuOpen && (
        <div className="absolute right-2 top-full mt-1 z-10 bg-bg-elevated rounded-lg shadow-lg border border-border-default py-1 min-w-[120px]">
          <button
            onClick={handleDelete}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
              showDeleteConfirm
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'text-text-secondary hover:bg-bg-hover'
            )}
          >
            <Trash2 className="h-4 w-4" />
            {showDeleteConfirm ? 'Confirm Delete?' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Empty State
 */
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <div className="h-16 w-16 rounded-full bg-bg-elevated flex items-center justify-center mb-4">
        <MessageCircle className="h-8 w-8 text-text-muted" />
      </div>
      <h3 className="text-sm font-medium text-text-primary mb-1">
        {hasSearch ? 'No conversations found' : 'No conversations yet'}
      </h3>
      <p className="text-xs text-text-secondary">
        {hasSearch
          ? 'Try a different search term'
          : 'Start a new chat to ask questions about the course'}
      </p>
    </div>
  );
}

/**
 * Loading Skeleton
 */
function LoadingSkeleton() {
  return (
    <div className="p-2 space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-bg-elevated" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-bg-elevated rounded w-3/4" />
            <div className="h-3 bg-bg-elevated rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Group sessions by date (Today, Yesterday, This Week, etc.)
 */
function groupSessionsByDate(sessions: ChatSession[]): Record<string, ChatSession[]> {
  const groups: Record<string, ChatSession[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    'This Month': [],
    Older: [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  sessions.forEach((session) => {
    const sessionDate = new Date(session.updated_at);

    if (sessionDate >= today) {
      groups.Today.push(session);
    } else if (sessionDate >= yesterday) {
      groups.Yesterday.push(session);
    } else if (sessionDate >= weekAgo) {
      groups['This Week'].push(session);
    } else if (sessionDate >= monthAgo) {
      groups['This Month'].push(session);
    } else {
      groups.Older.push(session);
    }
  });

  // Remove empty groups
  return Object.entries(groups).reduce((acc, [key, value]) => {
    if (value.length > 0) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, ChatSession[]>);
}
