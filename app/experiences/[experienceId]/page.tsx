import { cookies } from 'next/headers';
import Image from 'next/image';
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
        {/* Video + AI Chat Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Video Section - 2/3 width */}
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

          {/* AI Chat Preview - 1/3 width */}
          <div className="lg:col-span-1">
            <Card padding="lg" className="overflow-hidden h-full">
              <div className="mb-3">
                <h3 className="text-lg font-bold text-text-primary mb-1">
                  Ask ChronosAI
                </h3>
                <p className="text-sm text-text-secondary">
                  Get instant answers with timestamps
                </p>
              </div>
              <StaticChatPreview className="w-full min-h-[400px] lg:min-h-[500px]" />
            </Card>
          </div>
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
