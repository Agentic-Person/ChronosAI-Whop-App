'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, CheckCircle, Trophy, TrendingUp, Calendar, Video } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';

export default function DashboardPage() {
  // Mock data - will be replaced with actual API calls
  const stats = {
    totalVideos: 48,
    completedVideos: 12,
    currentStreak: 7,
    totalXP: 2450,
    totalCHRONOS: 3200,
  };

  const modules = [
    {
      id: '1',
      title: 'Module 1: Foundations',
      color: '#059669', // teal
      totalVideos: 12,
      completedVideos: 12,
      progress: 100,
      weeks: 3,
    },
    {
      id: '2',
      title: 'Module 2: Intermediate Skills',
      color: '#0891b2', // cyan
      totalVideos: 16,
      completedVideos: 8,
      progress: 50,
      weeks: 4,
    },
    {
      id: '3',
      title: 'Module 3: Advanced Techniques',
      color: '#7c3aed', // purple
      totalVideos: 20,
      completedVideos: 0,
      progress: 0,
      weeks: 5,
    },
  ];

  const recentVideos = [
    {
      id: '1',
      title: 'Introduction to Variables and Data Types',
      duration: '12:34',
      module: 'Module 2',
      moduleColor: '#0891b2',
      progress: 75,
      thumbnail: '/api/placeholder/160/90',
    },
    {
      id: '2',
      title: 'Functions and Scope',
      duration: '18:22',
      module: 'Module 2',
      moduleColor: '#0891b2',
      progress: 45,
      thumbnail: '/api/placeholder/160/90',
    },
    {
      id: '3',
      title: 'Working with Arrays',
      duration: '15:10',
      module: 'Module 2',
      moduleColor: '#0891b2',
      progress: 0,
      thumbnail: '/api/placeholder/160/90',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back!</h1>
        <p className="text-text-secondary">Continue your learning journey</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card hover padding="lg" className="bg-bg-card border border-border-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm mb-1">Total Videos</p>
                <p className="text-3xl font-bold">{stats.totalVideos}</p>
                <p className="text-sm text-accent-green mt-1">
                  {stats.completedVideos} completed
                </p>
              </div>
              <div className="w-12 h-12 bg-accent-cyan/10 rounded-xl flex items-center justify-center">
                <Video className="w-6 h-6 text-accent-cyan" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card hover padding="lg" className="bg-bg-card border border-border-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm mb-1">Current Streak</p>
                <p className="text-3xl font-bold">{stats.currentStreak}</p>
                <p className="text-sm text-accent-yellow mt-1">days</p>
              </div>
              <div className="w-12 h-12 bg-accent-yellow/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent-yellow" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card hover padding="lg" className="bg-bg-card border border-border-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm mb-1">Total XP</p>
                <p className="text-3xl font-bold">{stats.totalXP.toLocaleString()}</p>
                <p className="text-sm text-accent-purple mt-1">Level 12</p>
              </div>
              <div className="w-12 h-12 bg-accent-purple/10 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-accent-purple" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card hover padding="lg" className="bg-bg-card border border-border-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm mb-1">CHRONOS Tokens</p>
                <p className="text-3xl font-bold text-accent-green">
                  {stats.totalCHRONOS.toLocaleString()}
                </p>
                <p className="text-sm text-text-muted mt-1">≈ ${(stats.totalCHRONOS * 0.001).toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-accent-green/10 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-accent-green" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Continue Learning Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Continue Learning</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {recentVideos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card hover padding="none" className="overflow-hidden bg-bg-card border border-border-default">
                {/* Video Thumbnail */}
                <div className="relative aspect-video bg-bg-elevated">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-accent-cyan rounded-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-bg-app fill-bg-app" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs">
                    {video.duration}
                  </div>
                  {video.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg-app/50">
                      <div
                        className="h-full bg-accent-cyan"
                        style={{ width: `${video.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Video Info */}
                <div className="p-4">
                  <Badge
                    variant="info"
                    className="mb-2"
                    style={{ backgroundColor: `${video.moduleColor}20`, color: video.moduleColor }}
                  >
                    {video.module}
                  </Badge>
                  <h3 className="font-semibold mb-2 line-clamp-2">{video.title}</h3>
                  <div className="flex items-center justify-between text-sm text-text-muted">
                    <span>{video.progress}% complete</span>
                    <Button variant="ghost" size="sm">
                      Continue
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Learning Modules */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Learning Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card
                hover
                padding="lg"
                className="bg-bg-card border-2 cursor-pointer"
                style={{ borderColor: module.color + '40' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{module.title}</h3>
                    <p className="text-sm text-text-muted">
                      {module.weeks} weeks · {module.totalVideos} videos
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: module.color + '20' }}
                  >
                    <CheckCircle
                      className="w-5 h-5"
                      style={{ color: module.color }}
                    />
                  </div>
                </div>

                <ProgressBar
                  value={module.progress}
                  max={100}
                  className="mb-2"
                  barColor={module.color}
                />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">
                    {module.completedVideos} / {module.totalVideos} completed
                  </span>
                  <span className="font-semibold" style={{ color: module.color }}>
                    {module.progress}%
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
