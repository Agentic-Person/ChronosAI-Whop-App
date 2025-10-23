'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Home, Book, Calendar, Trophy, Wallet, BarChart, X, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/ProgressBar';

export interface Module {
  id: string;
  number: number;
  title: string;
  color: 'teal' | 'cyan' | 'purple' | 'red';
  stats: {
    duration: string;
    videos: number;
    weeks: number;
  };
  progress: number;
  weeks: Week[];
}

export interface Week {
  id: string;
  number: number;
  title: string;
  days: Day[];
}

export interface Day {
  id: string;
  number: number;
  title: string;
  completed: boolean;
}

export interface SidebarProps {
  modules: Module[];
  currentUser?: {
    name: string;
    xp: number;
    level: number;
    chronos: number;
  };
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  modules = [],
  currentUser,
  collapsed = false,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const toggleWeek = (weekId: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekId)) {
        next.delete(weekId);
      } else {
        next.add(weekId);
      }
      return next;
    });
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: MessageSquare, label: 'AI Chat', href: '/dashboard/student/chat' },
    { icon: Calendar, label: 'Calendar', href: '/dashboard/calendar' },
    { icon: Trophy, label: 'Achievements', href: '/dashboard/achievements' },
    { icon: Wallet, label: 'Wallet', href: '/dashboard/wallet' },
    { icon: BarChart, label: 'Leaderboard', href: '/dashboard/leaderboard' },
  ];

  const moduleColors = {
    teal: 'var(--module-1-color)',
    cyan: 'var(--module-2-color)',
    purple: 'var(--module-3-color)',
    red: 'var(--module-4-color)',
  };

  return (
    <aside className={cn('sidebar', collapsed && 'collapsed')}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-cyan rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold">B</span>
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold">CHRONOS AI</h1>
                <p className="text-xs text-text-secondary">Learning Hub</p>
              </div>
            )}
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={20} /> : <X size={20} />}
            </button>
          )}
        </div>

        {!collapsed && currentUser && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Level {currentUser.level}</span>
              <span className="text-accent-yellow font-semibold">{currentUser.xp} XP</span>
            </div>
            <ProgressBar value={(currentUser.xp % 100)} color="cyan" size="sm" />
            <div className="flex items-center justify-between p-3 bg-bg-card rounded-lg">
              <span className="text-sm text-text-secondary">CHRONOS Balance</span>
              <span className="text-lg font-bold text-accent-green">{currentUser.chronos}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Menu */}
      {!collapsed && (
        <nav className="sidebar-section">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-bg-hover text-accent-cyan'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  )}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Modules */}
      {!collapsed && (
        <div className="sidebar-section flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Book size={18} className="text-text-secondary" />
            <h2 className="text-sm font-semibold text-text-secondary uppercase">Learning Path</h2>
          </div>

          <div className="space-y-2">
            {modules.map((module) => {
              const isExpanded = expandedModules.has(module.id);

              return (
                <div key={module.id} className="space-y-1">
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="w-full module-card p-3 rounded-lg"
                    style={{
                      borderLeftColor: moduleColors[module.color],
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                          style={{
                            backgroundColor: `${moduleColors[module.color]}20`,
                            color: moduleColors[module.color],
                          }}
                        >
                          M{module.number}
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-sm">{module.title}</h3>
                          <p className="text-xs text-text-secondary">
                            {module.stats.videos} videos • {module.stats.duration}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>

                    {module.progress > 0 && (
                      <div className="mt-2">
                        <ProgressBar value={module.progress} size="sm" color="green" />
                      </div>
                    )}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden pl-4 space-y-1"
                      >
                        {module.weeks.map((week) => {
                          const weekExpanded = expandedWeeks.has(week.id);

                          return (
                            <div key={week.id} className="space-y-1">
                              <button
                                onClick={() => toggleWeek(week.id)}
                                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-bg-hover transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {weekExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  <span className="text-sm font-medium">Week {week.number}</span>
                                  <span className="text-xs text-text-muted">• {week.title}</span>
                                </div>
                              </button>

                              <AnimatePresence>
                                {weekExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden pl-4 space-y-1"
                                  >
                                    {week.days.map((day) => (
                                      <Link
                                        key={day.id}
                                        href={`/dashboard/modules/${module.id}/week/${week.number}/day/${day.number}`}
                                        className={cn(
                                          'flex items-center gap-2 p-2 rounded-lg text-sm transition-colors',
                                          day.completed
                                            ? 'text-text-secondary line-through'
                                            : 'text-text-primary hover:bg-bg-hover'
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            'w-5 h-5 rounded-full flex items-center justify-center text-xs',
                                            day.completed
                                              ? 'bg-accent-green text-bg-app'
                                              : 'bg-bg-elevated text-text-muted'
                                          )}
                                        >
                                          {day.completed ? '✓' : day.number}
                                        </div>
                                        <span>{day.title}</span>
                                      </Link>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
