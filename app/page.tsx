'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Clock, Zap, TrendingUp, Crown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StaticChatPreview } from '@/components/chat/StaticChatPreview';
import { VideoSummary } from '@/components/video/VideoSummary';

export default function LandingPage() {
  const benefits = [
    {
      icon: Clock,
      title: 'Chronos Gave Mortals Control Over Destiny. ChronosAI Gives You Control Over Your Time.',
      description: 'No more endless days of student support; your course runs on intelligence, not your exhaustion',
    },
    {
      icon: Zap,
      title: 'Transcribe, Index, Teach, Assess—All Automatically',
      description: 'One upload, infinite efficiency. Your entire course transforms from a time sink into a time machine that propels students forward',
    },
    {
      icon: TrendingUp,
      title: 'Your Students Get AI-Powered Mentorship. You Get Your Life Back.',
      description: 'Personalized learning calendars, instant Q&A with timestamps, adaptive quizzes—while you focus on what matters',
    },
    {
      icon: Crown,
      title: 'The Creator\'s Secret Weapon',
      description: 'Creators using ChronosAI handle 10x the student load with 1/10th the stress, completing more courses and serving more people without burning out',
    },
  ];

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-bg-sidebar via-bg-app to-bg-sidebar border-b border-border-primary">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-orange/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          {/* Title and Slogan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 text-gradient">
              ChronosAI
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary font-medium mb-8">
              Master Time. Master Your Business.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <a href="/api/whop/auth/login">
                <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-accent-orange to-accent-orange/90 text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-all shadow-lg border-2 border-white transform hover:scale-105">
                  Sign In with Whop
                  <ArrowRight className="w-5 h-5" />
                </button>
              </a>
              <Link href="#demo">
                <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#d1bba5] text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-all shadow-lg border-2 border-white transform hover:scale-105">
                  Learn More
                </button>
              </Link>
            </div>

            {/* Video + Video Summary Side by Side */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4"
            >
              {/* Video Placeholder - 2/3 width */}
              <div className="lg:col-span-2">
                <Card padding="lg" className="overflow-hidden">
                  <div className="aspect-video rounded-xl border-2 border-accent-orange/30 relative overflow-hidden bg-black">
                    {/* Video Image */}
                    <Image
                      src="/images/video/Whop_Video_001.jpg"
                      alt="Course Video: How To Make $100,000 Per Month With Whop"
                      fill
                      className="object-cover"
                      priority
                    />
                    
                    {/* YouTube Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer">
                        <Play className="w-10 h-10 text-white ml-1" fill="currentColor" />
                      </div>
                    </div>

                    {/* Subtle overlay for better play button visibility */}
                    <div className="absolute inset-0 bg-black/20 z-0" />
                  </div>
                </Card>
              </div>

              {/* Video Summary - 1/3 width, aligned with video */}
              <div className="lg:col-span-1 flex">
                <VideoSummary className="w-full aspect-video" />
              </div>
            </motion.div>

            {/* AI Chat Below Video */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-8"
            >
              <Card padding="lg" className="overflow-hidden">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-text-primary mb-1">
                    Ask ChronosAI
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Get instant answers with timestamps
                  </p>
                </div>
                <StaticChatPreview className="w-full min-h-[400px]" />
              </Card>
            </motion.div>

            {/* Benefits Grid - Below Video/AI Chat */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={index}
                    className="group relative bg-gradient-to-br from-bg-card/80 to-bg-app/80 backdrop-blur-sm rounded-xl p-6 border border-border-primary hover:border-accent-orange/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent-orange/10"
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-orange/20 to-accent-purple/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className="w-6 h-6 text-accent-orange" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-text-primary mb-2 group-hover:text-accent-orange transition-colors">
                          {benefit.title}
                        </h3>
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div id="demo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Content?
          </h2>
          <p className="text-xl text-text-secondary mb-8">
            Join creators who are turning passive videos into interactive learning experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/api/whop/auth/login">
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-accent-orange to-accent-orange/90 text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-all shadow-lg transform hover:scale-105">
                Sign In with Whop
                <ArrowRight className="w-5 h-5" />
              </button>
            </a>
            <Link href="#demo">
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#d1bba5] text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-all shadow-lg transform hover:scale-105">
                Learn More
              </button>
            </Link>
          </div>
          <p className="text-sm text-text-muted mt-6">
            No credit card required • Instant setup • Secure authentication
          </p>
        </motion.div>
      </div>
    </div>
  );
}
