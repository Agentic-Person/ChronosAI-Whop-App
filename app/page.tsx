'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Video, MessageSquare, Trophy, Calendar, Zap, Coins, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function LandingPage() {
  const features = [
    {
      icon: MessageSquare,
      title: 'AI Video Chat',
      description: 'Ask questions about any video and get instant, context-aware answers with timestamp citations.',
    },
    {
      icon: Trophy,
      title: 'Earn Rewards',
      description: 'Get CHRONOS tokens and XP for watching videos, completing quizzes, and achieving milestones.',
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'AI-generated personalized study plans that adapt to your learning pace and preferences.',
    },
    {
      icon: Video,
      title: 'Auto-Organized Content',
      description: 'Videos automatically grouped into days and weeks for structured learning progression.',
    },
    {
      icon: Zap,
      title: 'Real-time Progress',
      description: 'Track your learning journey with detailed analytics and completion percentages.',
    },
    {
      icon: Coins,
      title: 'Token Wallet',
      description: 'Earn, spend, and redeem CHRONOS tokens for exclusive rewards and features.',
    },
  ];

  const pricing = [
    {
      name: 'BASIC',
      price: '$19',
      period: 'per month',
      features: [
        '5 videos per month',
        'Basic AI chat',
        'Manual quizzes',
        'Progress tracking',
        '100 CHRONOS tokens/month',
      ],
    },
    {
      name: 'PRO',
      price: '$39',
      period: 'per month',
      features: [
        'Unlimited videos',
        'Advanced AI chat with RAG',
        'Auto-generated quizzes',
        'AI learning calendar',
        '1000 CHRONOS tokens/month',
        'Priority support',
      ],
      popular: true,
    },
    {
      name: 'ENTERPRISE',
      price: '$99',
      period: 'per month',
      features: [
        'Everything in PRO',
        'Team collaboration',
        'Custom branding',
        'API access',
        'Dedicated support',
        'Custom token rewards',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-50" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent-cyan/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <Badge variant="info" className="mb-6">
              AI-Powered Learning Platform
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gradient">
              Master Skills and Learning
              <br />
              Development with AI
            </h1>

            <p className="text-xl md:text-2xl text-text-secondary mb-8 max-w-3xl mx-auto">
              Transform passive video courses into interactive learning experiences.
              Chat with AI, earn rewards, and track your progress in real-time.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/api/whop/auth/login">
                <Button size="lg" icon={ArrowRight}>
                  Login with Whop
                </Button>
              </a>
              <Link href="#features">
                <Button size="lg" variant="secondary">
                  Learn More
                </Button>
              </Link>
            </div>

            <p className="text-sm text-text-muted mt-4">
              Whop Integration Ready • Secure OAuth Flow
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to Learn
            </h2>
            <p className="text-xl text-text-secondary">
              Powerful features designed for effective learning
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card hover padding="lg" className="h-full">
                  <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-7 h-7 text-bg-app" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-text-secondary">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-bg-sidebar">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-text-secondary">
              Choose the plan that fits your learning goals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricing.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card
                  variant={plan.popular ? 'elevated' : 'default'}
                  padding="lg"
                  className={plan.popular ? 'border-2 border-accent-cyan' : ''}
                >
                  {plan.popular && (
                    <Badge variant="info" className="mb-4">
                      Most Popular
                    </Badge>
                  )}

                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-text-secondary ml-2">/ {plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check size={20} className="text-accent-green mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.popular ? 'primary' : 'secondary'}
                    className="w-full"
                  >
                    Get Started
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
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
              Ready to Start Learning?
            </h2>
            <p className="text-xl text-text-secondary mb-8">
              Join thousands of learners mastering Roblox development with AI-powered tools.
            </p>
            <a href="/api/whop/auth/login">
              <Button size="lg" icon={ArrowRight}>
                Login with Whop
              </Button>
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
