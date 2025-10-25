import { cookies } from 'next/headers';
import { VideoCard } from '@/components/video/VideoCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MessageSquare, Calendar, Trophy, Video } from 'lucide-react';
import { TopNavigation } from '@/components/layout/TopNavigation';

export default async function ExperiencePage({
  params,
}: {
  params: { experienceId: string };
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('whop_access_token');

  // Mock user data - in production, fetch from auth context
  const user = {
    name: 'Student',
    xp: 1250,
    chronos: 450,
    level: 12,
  };

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Top Navigation for Whop */}
      <TopNavigation user={user} />

      {/* Page Header */}
      <div className="bg-gradient-hero border-b border-border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gradient mb-2">
                Welcome to Chronos AI
              </h1>
              <p className="text-text-secondary text-base sm:text-lg">
                Your AI-Powered Learning Assistant
              </p>
            </div>
            <Badge variant="success" className="hidden sm:inline-flex">Experience: {params.experienceId}</Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* AI Chat Feature */}
          <Card hover padding="lg" className="border-2 border-accent-orange/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-bg-app" />
              </div>
              <h2 className="text-2xl font-bold">AI Video Chat</h2>
            </div>
            <p className="text-text-secondary mb-4">
              Ask questions about any video and get instant, context-aware answers with timestamp citations.
            </p>
            <Badge variant="info">Coming Soon</Badge>
          </Card>

          {/* Learning Calendar */}
          <Card hover padding="lg" className="border-2 border-accent-purple/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-bg-app" />
              </div>
              <h2 className="text-2xl font-bold">Learning Calendar</h2>
            </div>
            <p className="text-text-secondary mb-4">
              AI-generated personalized study schedules that adapt to your learning pace and preferences.
            </p>
            <Badge variant="info">Coming Soon</Badge>
          </Card>

          {/* Progress Tracking */}
          <Card hover padding="lg" className="border-2 border-accent-green/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-bg-app" />
              </div>
              <h2 className="text-2xl font-bold">Progress & Rewards</h2>
            </div>
            <p className="text-text-secondary mb-4">
              Track your learning journey with detailed analytics, earn CHRONOS tokens, and unlock achievements.
            </p>
            <Badge variant="info">Coming Soon</Badge>
          </Card>
        </div>

        {/* Video Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Video className="w-8 h-8 text-accent-orange" />
              <h2 className="text-3xl font-bold">Your Course Videos</h2>
            </div>
            <Badge variant="default">0 videos available</Badge>
          </div>

          <Card padding="lg">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-bg-app rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Videos Yet</h3>
              <p className="text-text-secondary mb-6">
                Your course creator will upload videos here. Once available, you'll be able to watch them and chat with AI about the content.
              </p>
              <Badge variant="default">Check back soon!</Badge>
            </div>
          </Card>
        </div>

        {/* Features Overview */}
        <div className="bg-gradient-hero rounded-2xl p-8 border border-border-primary">
          <h2 className="text-2xl font-bold mb-6">What You Can Do with Chronos AI</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-accent-orange rounded-full mt-2"></div>
              <div>
                <h3 className="font-bold mb-1">Interactive Video Learning</h3>
                <p className="text-sm text-text-secondary">
                  Watch videos with AI-powered insights and instant answers to your questions
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-accent-purple rounded-full mt-2"></div>
              <div>
                <h3 className="font-bold mb-1">Automated Quizzes</h3>
                <p className="text-sm text-text-secondary">
                  Test your knowledge with AI-generated quizzes based on video content
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-accent-green rounded-full mt-2"></div>
              <div>
                <h3 className="font-bold mb-1">Personalized Schedule</h3>
                <p className="text-sm text-text-secondary">
                  Get a custom study plan that adapts to your pace and goals
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-accent-yellow rounded-full mt-2"></div>
              <div>
                <h3 className="font-bold mb-1">Earn Rewards</h3>
                <p className="text-sm text-text-secondary">
                  Collect CHRONOS tokens and XP for completing videos and quizzes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Access Info */}
        {accessToken ? (
          <div className="mt-6 p-4 bg-accent-green/10 border border-accent-green/20 rounded-lg">
            <p className="text-sm text-accent-green">
              ✓ You're authenticated and ready to learn!
            </p>
          </div>
        ) : (
          <div className="mt-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
            <p className="text-sm text-accent-red">
              ⚠ Not authenticated. Please log in to access all features.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
