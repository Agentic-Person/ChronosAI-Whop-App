# Feature Gating System Documentation

## Overview

The Video Wizard feature gating system allows the app to have tiered pricing with features enabled/disabled based on subscription level. This document explains how to use and extend the system.

## Plan Tiers

The platform offers three subscription tiers:

### Basic ($29/month)
- AI RAG Chat
- Video Upload & Processing
- Basic Progress Tracking
- Up to 50 videos, 100 students, 10GB storage

### Pro ($79/month) - MOST POPULAR
- Everything in Basic
- Learning Calendar
- Gamification & Achievements
- AI Quiz Generation
- Projects with AI Review
- Advanced Analytics
- Up to 500 videos, 1000 students, 100GB storage

### Enterprise ($199/month)
- Everything in Pro
- Creator Dashboard
- Student Management Tools
- AI Study Buddy
- Study Groups & Discord Integration
- Content Intelligence
- Custom Branding & API Access
- Unlimited everything

## Architecture

### Core Components

1. **Feature Type System** (`lib/features/types.ts`)
   - `PlanTier` enum: BASIC, PRO, ENTERPRISE
   - `Feature` enum: All features in the platform
   - `FEATURE_PLAN_MAPPING`: Maps features to required plan tiers
   - `PLAN_CONFIGS`: Complete configuration for each plan

2. **Feature Flag Service** (`lib/features/feature-flags.ts`)
   - Core service for checking feature access
   - Implements caching to reduce database calls
   - Provides helper functions for common operations

3. **Whop Plan Checker** (`lib/whop/plan-checker.ts`)
   - Extracts plan tier from Whop membership data
   - Validates memberships and checks expiration
   - Generates upgrade URLs

4. **Feature Gate Middleware** (`lib/middleware/feature-gate.ts`)
   - Higher-order functions to protect API routes
   - Automatically checks user's plan before allowing access
   - Returns 403 with upgrade information if blocked

5. **React Hooks** (`lib/hooks/useFeatureAccess.ts`)
   - Client-side hooks for checking feature access
   - `useFeatureAccess()`: Check single feature
   - `usePlanFeatures()`: Get all user's features
   - `useUserPlan()`: Get plan details and limits
   - `usePlanLimit()`: Check usage against limits

6. **UI Components** (`components/features/`)
   - `FeatureGate`: Wrap gated features
   - `UpgradePrompt`: Beautiful upgrade CTAs
   - `PlanBadge`: Display user's current plan

## Usage Guide

### Protecting API Routes

```typescript
// app/api/calendar/route.ts
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';

export const GET = withFeatureGate(
  { feature: Feature.FEATURE_LEARNING_CALENDAR },
  async (req) => {
    // Your protected route logic
    const calendar = await generateCalendar();
    return NextResponse.json(calendar);
  }
);
```

### Protecting UI Components

```typescript
// components/dashboard/CalendarSection.tsx
import { FeatureGate } from '@/components/features/FeatureGate';
import { Feature } from '@/lib/features/types';

export function CalendarSection() {
  return (
    <FeatureGate feature={Feature.FEATURE_LEARNING_CALENDAR}>
      <LearningCalendar />
    </FeatureGate>
  );
}
```

### Conditional Rendering

```typescript
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { Feature } from '@/lib/features/types';

export function DashboardNav() {
  const { hasAccess: hasCalendar } = useFeatureAccess(
    Feature.FEATURE_LEARNING_CALENDAR
  );

  return (
    <nav>
      <NavItem href="/videos">Videos</NavItem>
      {hasCalendar && <NavItem href="/calendar">Calendar</NavItem>}
    </nav>
  );
}
```

### Checking Plan Limits

```typescript
import { withPlanLimit } from '@/lib/middleware/feature-gate';

export const POST = withPlanLimit(
  'maxVideos',
  async (userId) => {
    const count = await getVideoCount(userId);
    return count;
  },
  async (req) => {
    // Upload video logic
    return NextResponse.json({ success: true });
  }
);
```

### Client-side Limit Checking

```typescript
import { usePlanLimit } from '@/lib/hooks/useFeatureAccess';

export function VideoUploadButton() {
  const videoCount = useVideoCount();
  const { withinLimit, limit, percentUsed } = usePlanLimit('maxVideos', videoCount);

  if (!withinLimit) {
    return <UpgradePrompt feature={Feature.FEATURE_VIDEO_UPLOAD} />;
  }

  if (percentUsed > 80) {
    return (
      <div>
        <UploadButton />
        <Warning>You've used {percentUsed}% of your video limit</Warning>
      </div>
    );
  }

  return <UploadButton />;
}
```

## Adding New Features

### 1. Add Feature to Enum

```typescript
// lib/features/types.ts
export enum Feature {
  // ... existing features
  FEATURE_NEW_AWESOME_THING = 'new_awesome_thing',
}
```

### 2. Map Feature to Plan Tier

```typescript
// lib/features/types.ts
export const FEATURE_PLAN_MAPPING: Record<Feature, PlanTier> = {
  // ... existing mappings
  [Feature.FEATURE_NEW_AWESOME_THING]: PlanTier.PRO, // or BASIC/ENTERPRISE
};
```

### 3. Add Feature Metadata

```typescript
// lib/features/types.ts
export const FEATURE_METADATA: Record<Feature, FeatureMetadata> = {
  // ... existing metadata
  [Feature.FEATURE_NEW_AWESOME_THING]: {
    name: 'New Awesome Thing',
    description: 'This feature does something amazing',
    category: 'advanced',
    icon: 'Sparkles',
  },
};
```

### 4. Update Plan Configs (if needed)

```typescript
// lib/features/types.ts
export const PLAN_CONFIGS: Record<PlanTier, PlanTierConfig> = {
  [PlanTier.PRO]: {
    // ... existing config
    features: [
      // ... existing features
      Feature.FEATURE_NEW_AWESOME_THING,
    ],
  },
};
```

### 5. Protect the Feature

```typescript
// In your API route or component
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { FeatureGate } from '@/components/features/FeatureGate';
import { Feature } from '@/lib/features/types';

// API
export const GET = withFeatureGate(
  { feature: Feature.FEATURE_NEW_AWESOME_THING },
  async (req) => {
    // Protected logic
  }
);

// Component
<FeatureGate feature={Feature.FEATURE_NEW_AWESOME_THING}>
  <NewAwesomeThing />
</FeatureGate>
```

## Whop Integration

### Configuration

Set these environment variables:

```bash
# Whop OAuth
WHOP_CLIENT_ID=your_client_id
WHOP_WEBHOOK_SECRET=your_webhook_secret

# Checkout URLs (one per plan)
NEXT_PUBLIC_WHOP_BASIC_CHECKOUT_URL=https://whop.com/checkout/plan_xxx
NEXT_PUBLIC_WHOP_PRO_CHECKOUT_URL=https://whop.com/checkout/plan_yyy
NEXT_PUBLIC_WHOP_ENTERPRISE_CHECKOUT_URL=https://whop.com/checkout/plan_zzz
```

### Plan ID Mapping

Configure how Whop plan IDs map to internal tiers:

```typescript
// During app initialization (e.g., in a startup file)
import { WhopPlanChecker } from '@/lib/whop/plan-checker';

WhopPlanChecker.configurePlanMapping({
  basic: ['plan_abc123', 'basic_tier'],
  pro: ['plan_def456', 'pro_tier'],
  enterprise: ['plan_ghi789', 'enterprise_tier'],
});
```

### Webhook Setup

The enhanced webhook handler automatically manages plan changes:

```typescript
// app/api/webhooks/whop/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WhopWebhookHandler } from '@/lib/whop/webhooks';
import { EnhancedWhopWebhookHandler } from '@/lib/whop/webhooks-enhanced';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-whop-signature') || '';
  const timestamp = req.headers.get('x-whop-timestamp') || '';
  const rawBody = await req.text();

  // Verify signature
  if (!WhopWebhookHandler.verifySignature(rawBody, signature, timestamp)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  // Handle with enhanced handler (includes plan management)
  const result = await WhopWebhookHandler.handleWebhook(payload);

  return NextResponse.json(result);
}
```

## Testing

### Unit Tests

```typescript
// lib/features/__tests__/feature-flags.test.ts
import { FeatureFlagService } from '@/lib/features/feature-flags';
import { Feature, PlanTier } from '@/lib/features/types';

describe('FeatureFlagService', () => {
  it('should grant access to BASIC features for BASIC users', async () => {
    const result = await FeatureFlagService.hasFeatureAccess(
      'user_basic',
      Feature.FEATURE_RAG_CHAT
    );

    expect(result.hasAccess).toBe(true);
    expect(result.userPlan).toBe(PlanTier.BASIC);
  });

  it('should deny access to PRO features for BASIC users', async () => {
    const result = await FeatureFlagService.hasFeatureAccess(
      'user_basic',
      Feature.FEATURE_LEARNING_CALENDAR
    );

    expect(result.hasAccess).toBe(false);
    expect(result.upgradeRequired).toBe(true);
    expect(result.requiredPlan).toBe(PlanTier.PRO);
  });
});
```

### Integration Tests

```typescript
// lib/middleware/__tests__/feature-gate.test.ts
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';

describe('Feature Gate Middleware', () => {
  it('should allow access for users with correct plan', async () => {
    const handler = withFeatureGate(
      { feature: Feature.FEATURE_LEARNING_CALENDAR },
      async () => NextResponse.json({ success: true })
    );

    const req = createMockRequest({ userId: 'user_pro' });
    const response = await handler(req);

    expect(response.status).toBe(200);
  });

  it('should block access and return upgrade URL', async () => {
    const handler = withFeatureGate(
      { feature: Feature.FEATURE_LEARNING_CALENDAR },
      async () => NextResponse.json({ success: true })
    );

    const req = createMockRequest({ userId: 'user_basic' });
    const response = await handler(req);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.code).toBe('FEATURE_GATED');
    expect(data.details.upgradeUrl).toBeDefined();
  });
});
```

### Testing Locally

```typescript
// Set test plan for a user
import { createClient } from '@/lib/utils/supabase-client';

const supabase = createClient();
await supabase
  .from('creators')
  .update({ current_plan: 'pro' })
  .eq('whop_user_id', 'test_user_123');
```

## Performance Considerations

### Caching

The system implements a 5-minute cache for plan lookups to reduce database calls:

```typescript
// Cache is automatically managed, but can be manually cleared:
import { invalidatePlanCache } from '@/lib/features/feature-flags';

// After plan change
invalidatePlanCache(userId);

// Clear all cache
FeatureFlagService.clearAllCache();
```

### Best Practices

1. **Check features at the boundary**: Gate at API routes and top-level components
2. **Batch checks when possible**: Use `checkMultipleFeatures()` for multiple checks
3. **Cache aggressively**: Plan changes are rare, so cache heavily
4. **Fail closed**: If there's an error checking access, deny by default
5. **Log access attempts**: Use the `logAccess` option for analytics

## Analytics

Feature access is automatically logged when middleware is used:

```typescript
// Query feature access analytics
const supabase = createClient();
const { data } = await supabase
  .from('analytics_events')
  .select('*')
  .eq('event_type', 'feature_access')
  .eq('feature_accessed', 'learning_calendar');
```

## Troubleshooting

### Users report features not accessible after upgrade

1. Check if webhook was received and processed
2. Verify plan in database: `SELECT current_plan FROM creators WHERE whop_user_id = ?`
3. Clear plan cache: `invalidatePlanCache(userId)`
4. Check Whop membership status via API

### Features showing for wrong plan tier

1. Verify `FEATURE_PLAN_MAPPING` is correct
2. Check plan ID mapping in `WhopPlanChecker`
3. Review webhook logs for plan updates
4. Verify RLS policies aren't blocking updates

### Performance issues with feature checks

1. Enable caching (default: enabled)
2. Reduce cache TTL if data is stale
3. Use batch feature checks
4. Add database indexes (included in migration)

## Migration Guide

### From Existing System

If migrating from an existing feature gating system:

1. Run the migration: `supabase db push --include 20251020000003_add_plan_tracking.sql`
2. Update all existing users with default plan: Already handled in migration
3. Map old tier names to new: Update `WhopPlanChecker.configurePlanMapping()`
4. Replace old middleware with new: Search and replace import statements
5. Update UI components: Use new `FeatureGate` components
6. Test thoroughly with each plan tier

## Security Considerations

1. **Never trust client-side checks**: Always validate on the server
2. **Verify webhook signatures**: Always call `WhopWebhookHandler.verifySignature()`
3. **Use RLS policies**: Database-level security (included in migration)
4. **Rate limit**: Implement rate limiting on feature check APIs
5. **Audit logs**: Monitor `analytics_events` for suspicious patterns

## Support

For questions or issues with the feature gating system:

1. Check this documentation
2. Review test files for examples
3. Check the codebase comments (JSDoc)
4. Contact the development team

## Changelog

- **2025-01-20**: Initial feature gating system implementation
  - Three-tier plan structure (BASIC, PRO, ENTERPRISE)
  - Complete middleware and UI component suite
  - Whop webhook integration
  - Database schema with plan tracking
  - Comprehensive testing utilities
