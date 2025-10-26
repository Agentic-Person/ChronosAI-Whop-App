'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Database, MessageSquare, BarChart, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { VideoCarousel } from '@/components/chat/VideoCarousel';
import { StaticChatPreview } from '@/components/chat/StaticChatPreview';

export default function LandingPage() {
  // Core features - only 3 essential features
  const features = [
    {
      icon: Database,
      title: 'Video Processing & Storage',
      description: 'Automatic video upload, transcription, and embedding with Supabase. Your content is securely stored and instantly searchable with vector embeddings.',
    },
    {
      icon: MessageSquare,
      title: 'AI Chat with RAG',
      description: 'Intelligent chat that searches across all your videos using vector embeddings. Get instant answers with precise timestamp citations.',
    },
    {
      icon: BarChart,
      title: 'Creator Dashboard',
      description: 'Comprehensive analytics, student engagement metrics, and video management. Track completion rates, popular content, and student performance.',
    },
  ];

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Hero Section - ChatGPT Style Clean & Centered */}
      <section className="relative overflow-hidden py-12 md:py-16">
        {/* Subtle background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent-orange/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-orange/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Title and Slogan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            {/* Simple Tagline */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-accent-orange" />
              <span className="text-sm font-medium text-text-secondary">Intelligent Video Learning</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 text-gradient px-4 py-2">
              Rapid Video Digestion Enabler
            </h1>

            <p className="text-xl md:text-2xl text-text-secondary mb-8 max-w-3xl mx-auto">
              Because time shouldn't stand between you and understanding
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <a href="/api/whop/auth/login">
                <Button size="lg" icon={ArrowRight}>
                  Sign In with Whop
                </Button>
              </a>
              <Link href="#features">
                <Button size="lg" variant="secondary">
                  Learn More
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Video Carousel - No Background */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-accent-orange" />
              <h3 className="text-sm font-semibold text-text-primary">Your Course Library</h3>
            </div>
            <VideoCarousel />
          </motion.div>

          {/* Static Chat Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-4xl mx-auto"
          >
            <StaticChatPreview className="h-[500px]" />
          </motion.div>
        </div>
      </section>

      {/* Learn More / Features Section */}
      <section id="features" className="py-24 px-6 bg-bg-sidebar">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Core Platform Features
            </h2>
            <p className="text-xl text-text-secondary">
              Everything you need to transform video courses into interactive learning
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card hover padding="lg" className="h-full border border-border-default">
                  <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center mb-4 shadow-md">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-text-secondary leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <div className="max-w-3xl mx-auto bg-bg-card border border-border-default rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-4">Built for Whop Creators</h3>
              <p className="text-text-secondary mb-6">
                Seamlessly integrate with your Whop community. Automatic member sync,
                secure OAuth authentication, and webhook support for real-time updates.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-text-muted">
                <span>✓ Secure OAuth Flow</span>
                <span>✓ Automatic Member Sync</span>
                <span>✓ Real-time Webhooks</span>
                <span>✓ Vector Search</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Content?
            </h2>
            <p className="text-xl text-text-secondary mb-8">
              Join Whop creators who are turning passive videos into interactive learning experiences.
            </p>
            <a href="/api/whop/auth/login">
              <Button size="lg" icon={ArrowRight}>
                Sign In with Whop
              </Button>
            </a>
            <p className="text-sm text-text-muted mt-6">
              No credit card required • Instant setup • Secure authentication
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
