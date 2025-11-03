import { cookies } from 'next/headers';
import { Card } from '@/components/ui/Card';
import { Play, Clock, Zap, TrendingUp, Moon } from 'lucide-react';
import { StaticChatPreview } from '@/components/chat/StaticChatPreview';

export default async function ExperiencePage({
  params,
}: {
  params: { experienceId: string };
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('whop_access_token');

  const benefits = [
    {
      icon: Moon,
      title: 'Stop Selling Your Hours to Student Support',
      description: 'While you sleep, ChronosAI handles the questions, freeing up 10+ hours per week to build, market, or actually live your life',
    },
    {
      icon: Clock,
      title: 'Let the God of Time Manage Your Course',
      description: 'Every video transcribed, indexed, and searchable instantly so students find answers before they ever need to ask you',
    },
    {
      icon: Zap,
      title: 'Your Courses Work 24/7 Without You',
      description: 'AI-powered quizzes, personalized learning paths, and instant responses mean your course generates value while you\'re offline',
    },
    {
      icon: TrendingUp,
      title: 'Turn Passive Hours Into Profit',
      description: 'Boost completion rates by 40%+ and cut support burden by 80%, so each student is worth significantly more to your bottom line',
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
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 text-gradient">
              ChronosAI
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary font-medium">
              Reclaim Your Time. Chronos Is Your AI Teaching Assistant.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Video Section - Full Width */}
        <div className="mb-8">
          <Card padding="lg" className="overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-bg-sidebar to-bg-app rounded-xl border-2 border-accent-orange/30 flex items-center justify-center relative overflow-hidden">
              {/* Video Placeholder Content */}
              <div className="text-center z-10">
                <div className="w-24 h-24 bg-accent-orange/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-accent-orange/40 animate-pulse">
                  <Play className="w-12 h-12 text-accent-orange" />
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-2">Course Video</h3>
                <p className="text-base text-text-secondary">
                  Watch your course videos here
                </p>
              </div>
              
              {/* Animated background */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-accent-orange/20 via-transparent to-accent-purple/20 animate-pulse"></div>
              </div>
            </div>
          </Card>
        </div>

        {/* AI Chat Demo - Full Width Underneath */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              See ChronosAI in Action
            </h2>
            <p className="text-text-secondary">
              Watch how students get instant answers with timestamp citations
            </p>
          </div>
          <StaticChatPreview className="w-full min-h-[600px]" />
        </div>

        {/* Access Info */}
        {accessToken ? (
          <div className="p-4 bg-accent-green/10 border border-accent-green/20 rounded-lg text-center">
            <p className="text-sm text-accent-green">
              ✓ You're authenticated and ready to learn!
            </p>
          </div>
        ) : (
          <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg text-center">
            <p className="text-sm text-accent-red">
              ⚠ Not authenticated. Please log in to access all features.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
