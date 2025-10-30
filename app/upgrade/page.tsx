/**
 * Upgrade / Pricing Page
 *
 * Shows pricing tiers and allows creators to upgrade from trial
 */

import { redirect } from 'next/navigation';
import { Check, Sparkles, Crown, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getTrialInfo } from '@/lib/trial/trial-manager';
import { PlanTier } from '@/lib/features/types';

// This should come from server-side auth
// TODO: Replace with actual auth getCreatorId()
async function getCreatorId(): Promise<string | null> {
  // Placeholder - implement real auth
  return null;
}

interface PricingTier {
  tier: PlanTier;
  name: string;
  price: number;
  popular?: boolean;
  icon: React.ReactNode;
  description: string;
  features: string[];
  limits: {
    videos: string;
    students: string;
    storage: string;
    aiMessages: string;
  };
  cta: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    tier: PlanTier.BASIC,
    name: 'Basic',
    price: 29,
    icon: <Sparkles className="w-6 h-6" />,
    description: 'Perfect for getting started with AI-powered video learning',
    features: [
      'AI Chat with Videos',
      'Progress Tracking',
      'Video Upload & Processing',
      'Automatic Transcription',
      'Search with Timestamps',
      'Basic Analytics',
    ],
    limits: {
      videos: 'Up to 10 videos',
      students: 'Up to 100 students',
      storage: '10 GB storage',
      aiMessages: '1,000 AI messages/mo',
    },
    cta: 'Start with Basic',
  },
  {
    tier: PlanTier.PRO,
    name: 'Pro',
    price: 99,
    popular: true,
    icon: <Crown className="w-6 h-6" />,
    description: 'Advanced learning features for serious educators',
    features: [
      'Everything in Basic',
      'AI Quiz Generation',
      'Learning Calendar',
      'Gamification & XP',
      'Achievements & Badges',
      'Projects with AI Review',
      'Advanced Analytics',
      'Priority Support',
    ],
    limits: {
      videos: 'Up to 50 videos',
      students: 'Up to 1,000 students',
      storage: '100 GB storage',
      aiMessages: '10,000 AI messages/mo',
    },
    cta: 'Upgrade to Pro',
  },
  {
    tier: PlanTier.ENTERPRISE,
    name: 'Enterprise',
    price: 299,
    icon: <Building2 className="w-6 h-6" />,
    description: 'Complete platform for professional creators',
    features: [
      'Everything in Pro',
      'Unlimited Videos',
      'Unlimited Students',
      'AI Study Buddy',
      'Study Groups',
      'Discord Integration',
      'Content Intelligence',
      'Custom Branding',
      'API Access',
      'Dedicated Support',
    ],
    limits: {
      videos: 'Unlimited videos',
      students: 'Unlimited students',
      storage: 'Unlimited storage',
      aiMessages: 'Unlimited AI messages',
    },
    cta: 'Go Enterprise',
  },
];

export default async function UpgradePage() {
  const creatorId = await getCreatorId();

  if (!creatorId) {
    redirect('/');
  }

  const trialInfo = await getTrialInfo(creatorId);

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Header */}
      <div className="border-b border-border-primary bg-bg-elevated">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            {trialInfo && trialInfo.daysRemaining > 0 ? (
              <>
                You have {trialInfo.daysRemaining} {trialInfo.daysRemaining === 1 ? 'day' : 'days'} left
                in your trial. Upgrade to unlock all features and add your own content.
              </>
            ) : (
              <>
                Unlock the full power of AI-enhanced video learning.
                Upload your own videos and create amazing courses.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {PRICING_TIERS.map((tier) => (
            <Card
              key={tier.tier}
              className={cn(
                'relative p-6 flex flex-col',
                tier.popular && 'border-2 border-accent-cyan shadow-lg scale-105'
              )}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-accent-cyan text-bg-app px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-accent-cyan">{tier.icon}</div>
                  <h3 className="text-2xl font-bold">{tier.name}</h3>
                </div>
                <p className="text-text-muted text-sm">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">${tier.price}</span>
                  <span className="text-text-muted">/month</span>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                className={cn(
                  'w-full mb-6',
                  tier.popular && 'bg-accent-cyan hover:bg-accent-cyan/90'
                )}
                onClick={() => {
                  // TODO: Implement Whop checkout
                  window.location.href = `/api/whop/subscribe?tier=${tier.tier}`;
                }}
              >
                {tier.cta}
              </Button>

              {/* Limits */}
              <div className="mb-6 p-4 bg-bg-app rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Videos:</span>
                    <span className="font-medium">{tier.limits.videos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Students:</span>
                    <span className="font-medium">{tier.limits.students}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Storage:</span>
                    <span className="font-medium">{tier.limits.storage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">AI Messages:</span>
                    <span className="font-medium">{tier.limits.aiMessages}</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3 flex-1">
                {tier.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-accent-cyan flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* FAQ / Additional Info */}
        <div className="max-w-3xl mx-auto mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>

          <div className="space-y-4 text-left">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Can I change my plan later?</h3>
              <p className="text-text-muted text-sm">
                Yes! You can upgrade or downgrade your plan at any time from your account settings.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">What happens to my demo content?</h3>
              <p className="text-text-muted text-sm">
                When you upgrade, demo content is automatically removed and you get a clean slate
                to upload your own videos and create custom courses.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-text-muted text-sm">
                Yes, we offer a 14-day money-back guarantee. If you're not satisfied, contact
                support for a full refund.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">How is billing handled?</h3>
              <p className="text-text-muted text-sm">
                All billing is handled securely through Whop. You'll be billed monthly and can
                cancel anytime from your Whop account.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
