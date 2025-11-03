import { cookies } from 'next/headers';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Video, Play } from 'lucide-react';
import { StaticChatPreview } from '@/components/chat/StaticChatPreview';

export default async function ExperiencePage({
  params,
}: {
  params: { experienceId: string };
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('whop_access_token');

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Features Overview - Moved to Top */}
        <div className="bg-gradient-hero rounded-2xl p-8 border border-border-primary mb-8">
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

        {/* Video + AI Chat Layout - 2/3 video, 1/3 chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Video Placeholder - Takes 2/3 width */}
          <div className="lg:col-span-2">
            <Card padding="lg" className="h-full">
              <div className="aspect-video bg-gradient-to-br from-bg-sidebar to-bg-app rounded-xl border-2 border-accent-orange/30 flex items-center justify-center relative overflow-hidden">
                {/* Video Placeholder Content */}
                <div className="text-center z-10">
                  <div className="w-20 h-20 bg-accent-orange/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-accent-orange/40">
                    <Play className="w-10 h-10 text-accent-orange" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">Course Video</h3>
                  <p className="text-sm text-text-secondary">
                    Watch your course videos here
                  </p>
                </div>
                
                {/* Subtle animated background */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-accent-orange/20 via-transparent to-accent-purple/20 animate-pulse"></div>
                </div>
              </div>
            </Card>
          </div>

          {/* AI Chat Box - Takes 1/3 width */}
          <div className="lg:col-span-1">
            <StaticChatPreview className="h-full min-h-[500px]" />
          </div>
        </div>

        {/* Access Info */}
        {accessToken ? (
          <div className="p-4 bg-accent-green/10 border border-accent-green/20 rounded-lg">
            <p className="text-sm text-accent-green">
              ✓ You're authenticated and ready to learn!
            </p>
          </div>
        ) : (
          <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
            <p className="text-sm text-accent-red">
              ⚠ Not authenticated. Please log in to access all features.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
