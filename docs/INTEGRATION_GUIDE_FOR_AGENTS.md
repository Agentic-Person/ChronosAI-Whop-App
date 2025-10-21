# Quick Integration Guide for Other Agents

## For Agents 1-11: How to Use the Feature Gating System

This is a quick reference guide for integrating your feature module with the plan-based feature gating system.

---

## Step 1: Identify Your Features

Check `lib/features/types.ts` for your assigned features:

```typescript
// Agent 1 - RAG Module
Feature.FEATURE_RAG_CHAT // BASIC tier

// Agent 2 - Learning Calendar
Feature.FEATURE_LEARNING_CALENDAR // PRO tier

// Agent 3 - Gamification
Feature.FEATURE_GAMIFICATION // PRO tier
Feature.FEATURE_ACHIEVEMENTS // PRO tier

// Agent 4 - Assessments
Feature.FEATURE_QUIZZES // PRO tier
Feature.FEATURE_PROJECTS // PRO tier

// Agent 5 - Progress Tracking
Feature.FEATURE_BASIC_PROGRESS_TRACKING // BASIC tier
Feature.FEATURE_ADVANCED_ANALYTICS // PRO tier

// Agent 6 - Creator Dashboard
Feature.FEATURE_CREATOR_DASHBOARD // ENTERPRISE tier
Feature.FEATURE_STUDENT_MANAGEMENT // ENTERPRISE tier

// Agent 7 - Study Buddy
Feature.FEATURE_AI_STUDY_BUDDY // ENTERPRISE tier

// Agent 8 - Study Groups
Feature.FEATURE_STUDY_GROUPS // ENTERPRISE tier

// Agent 9 - Discord
Feature.FEATURE_DISCORD_INTEGRATION // ENTERPRISE tier

// Agent 10 - Intelligence
Feature.FEATURE_CONTENT_INTELLIGENCE // ENTERPRISE tier

// Agent 11 - Infrastructure
Feature.FEATURE_CUSTOM_BRANDING // ENTERPRISE tier
Feature.FEATURE_API_ACCESS // ENTERPRISE tier
```

---

## Step 2: Protect Your API Routes

### Basic Feature Gate

```typescript
// app/api/your-feature/route.ts
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withFeatureGate(
  { feature: Feature.FEATURE_YOUR_FEATURE },
  async (req: NextRequest) => {
    // Your protected logic here
    const data = await yourLogic();
    return NextResponse.json(data);
  }
);
```

### Multiple Features Required

```typescript
import { withMultipleFeatureGates } from '@/lib/middleware/feature-gate';

export const POST = withMultipleFeatureGates(
  [Feature.FEATURE_QUIZZES, Feature.FEATURE_PROJECTS],
  async (req) => {
    // Requires BOTH features
    return NextResponse.json({ success: true });
  }
);
```

### With Usage Limits

```typescript
import { withPlanLimit } from '@/lib/middleware/feature-gate';

// Get current count function
async function getVideoCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', userId);
  return count || 0;
}

export const POST = withPlanLimit(
  'maxVideos',
  getVideoCount,
  async (req) => {
    // Only executes if under limit
    await uploadVideo();
    return NextResponse.json({ success: true });
  }
);
```

---

## Step 3: Protect Your UI Components

### Wrap Entire Components

```typescript
// components/your-feature/YourFeature.tsx
import { FeatureGate } from '@/components/features/FeatureGate';
import { Feature } from '@/lib/features/types';

export function YourFeature() {
  return (
    <FeatureGate feature={Feature.FEATURE_YOUR_FEATURE}>
      <YourFeatureContent />
    </FeatureGate>
  );
}
```

### Conditional Rendering

```typescript
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';

export function Dashboard() {
  const { hasAccess, isLoading } = useFeatureAccess(
    Feature.FEATURE_LEARNING_CALENDAR
  );

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h1>Dashboard</h1>
      {hasAccess && <CalendarWidget />}
    </div>
  );
}
```

### Show Upgrade Prompt

```typescript
import { FeatureGate } from '@/components/features/FeatureGate';
import { UpgradePrompt } from '@/components/features/UpgradePrompt';

export function PremiumFeature() {
  return (
    <FeatureGate
      feature={Feature.FEATURE_YOUR_FEATURE}
      fallback={
        <UpgradePrompt
          feature={Feature.FEATURE_YOUR_FEATURE}
          currentPlan={PlanTier.BASIC}
          requiredPlan={PlanTier.PRO}
          variant="card"
        />
      }
    >
      <YourPremiumContent />
    </FeatureGate>
  );
}
```

---

## Step 4: Navigation Guards

Only show navigation items if user has access:

```typescript
// components/nav/Sidebar.tsx
import { usePlanFeatures } from '@/lib/hooks/useFeatureAccess';
import { Feature } from '@/lib/features/types';

export function Sidebar() {
  const { hasFeature } = usePlanFeatures();

  return (
    <nav>
      <NavItem href="/videos">Videos</NavItem>

      {hasFeature(Feature.FEATURE_LEARNING_CALENDAR) && (
        <NavItem href="/calendar">Calendar</NavItem>
      )}

      {hasFeature(Feature.FEATURE_CREATOR_DASHBOARD) && (
        <NavItem href="/dashboard">Dashboard</NavItem>
      )}

      {hasFeature(Feature.FEATURE_QUIZZES) && (
        <NavItem href="/quizzes">Quizzes</NavItem>
      )}
    </nav>
  );
}
```

---

## Step 5: Handle Usage Limits

### Client-Side Limit Display

```typescript
import { usePlanLimit } from '@/lib/hooks/useFeatureAccess';

export function VideoUploadSection() {
  const [videoCount, setVideoCount] = useState(0);

  const {
    withinLimit,
    limit,
    percentUsed,
    remaining,
  } = usePlanLimit('maxVideos', videoCount);

  if (!withinLimit) {
    return (
      <div>
        <h2>Video Limit Reached</h2>
        <p>You've uploaded {videoCount} of {limit} videos.</p>
        <UpgradePrompt feature={Feature.FEATURE_VIDEO_UPLOAD} />
      </div>
    );
  }

  return (
    <div>
      <UploadButton />
      <ProgressBar value={percentUsed} />
      <p>{remaining} videos remaining</p>
    </div>
  );
}
```

---

## Step 6: Test Your Integration

### 1. Test with BASIC Plan

```typescript
// Set user to BASIC plan
const supabase = createClient();
await supabase
  .from('creators')
  .update({ current_plan: 'basic' })
  .eq('whop_user_id', 'test_user');
```

**Expected:**
- ✅ BASIC features accessible
- ❌ PRO features blocked with upgrade prompt
- ❌ ENTERPRISE features blocked

### 2. Test with PRO Plan

```typescript
await supabase
  .from('creators')
  .update({ current_plan: 'pro' })
  .eq('whop_user_id', 'test_user');
```

**Expected:**
- ✅ BASIC features accessible
- ✅ PRO features accessible
- ❌ ENTERPRISE features blocked

### 3. Test with ENTERPRISE Plan

```typescript
await supabase
  .from('creators')
  .update({ current_plan: 'enterprise' })
  .eq('whop_user_id', 'test_user');
```

**Expected:**
- ✅ All features accessible
- ✅ Unlimited limits

### 4. Test Limits

```typescript
// Test maxVideos limit for BASIC (50 videos)
await uploadVideos(50);
// Next upload should be blocked
await uploadVideo(); // Should return 403
```

---

## Common Patterns by Agent

### Agent 1 - RAG Chat (BASIC)
```typescript
// No gating needed - it's BASIC tier
// But consider tracking message count for future limits

export const POST = async (req: NextRequest) => {
  // Direct implementation
  const response = await chatWithAI(request);
  return NextResponse.json(response);
};
```

### Agent 2 - Learning Calendar (PRO)
```typescript
// Gate the entire calendar feature
export const GET = withFeatureGate(
  { feature: Feature.FEATURE_LEARNING_CALENDAR },
  async (req) => {
    const calendar = await generateCalendar(userId);
    return NextResponse.json(calendar);
  }
);
```

### Agent 4 - Assessments (PRO)
```typescript
// Gate quiz creation AND limit count
export const POST = withPlanLimit(
  'maxQuizzes',
  async (userId) => await getQuizCount(userId),
  withFeatureGate(
    { feature: Feature.FEATURE_QUIZZES },
    async (req) => {
      const quiz = await createQuiz(data);
      return NextResponse.json(quiz);
    }
  )
);
```

### Agent 6 - Creator Dashboard (ENTERPRISE)
```typescript
// Gate with multiple features
export const GET = withMultipleFeatureGates(
  [
    Feature.FEATURE_CREATOR_DASHBOARD,
    Feature.FEATURE_STUDENT_MANAGEMENT
  ],
  async (req) => {
    const dashboard = await getDashboardData();
    return NextResponse.json(dashboard);
  }
);
```

---

## Error Responses You'll Get

### Feature Blocked (403)

```json
{
  "error": "Feature Access Denied",
  "message": "This feature requires PRO plan or higher",
  "code": "FEATURE_GATED",
  "details": {
    "feature": "learning_calendar",
    "featureName": "Learning Calendar",
    "currentPlan": "basic",
    "requiredPlan": "pro",
    "upgradeUrl": "https://whop.com/checkout/plan_pro"
  }
}
```

### Limit Exceeded (403)

```json
{
  "error": "Plan Limit Exceeded",
  "message": "You have reached your plan limit for maxVideos",
  "code": "PLAN_LIMIT_EXCEEDED",
  "details": {
    "limitType": "maxVideos",
    "currentUsage": 50,
    "limit": 50,
    "currentPlan": "basic",
    "upgradeUrl": "https://whop.com/checkout/plan_pro"
  }
}
```

---

## Styling Upgrade Prompts

All upgrade prompts use Tailwind CSS and are pre-styled. Variants available:

```typescript
<UpgradePrompt
  feature={Feature.FEATURE_YOUR_FEATURE}
  currentPlan={PlanTier.BASIC}
  requiredPlan={PlanTier.PRO}
  variant="card"      // Large card with features
  // variant="banner"  // Horizontal banner
  // variant="modal"   // Full-screen modal
  // variant="inline"  // Small inline text
/>
```

---

## Need Help?

1. **Read the docs:** `docs/FEATURE_GATING.md`
2. **Check examples:** See test files for usage patterns
3. **Review types:** All features defined in `lib/features/types.ts`
4. **Ask Agent 0:** I created this system and can help debug

---

## Checklist Before Submitting Your Module

- [ ] All API routes protected with `withFeatureGate()`
- [ ] All UI components wrapped with `<FeatureGate>`
- [ ] Navigation items conditionally rendered
- [ ] Usage limits enforced (if applicable)
- [ ] Tested with BASIC, PRO, and ENTERPRISE plans
- [ ] Upgrade prompts shown for blocked features
- [ ] No client-side bypasses possible
- [ ] Error messages are clear and actionable
- [ ] Feature works correctly when user upgrades mid-session

---

## Quick Reference - Import Statements

```typescript
// Types
import { Feature, PlanTier } from '@/lib/features/types';

// Middleware
import {
  withFeatureGate,
  withPlanLimit,
  withMultipleFeatureGates
} from '@/lib/middleware/feature-gate';

// Hooks
import {
  useFeatureAccess,
  usePlanFeatures,
  useUserPlan,
  usePlanLimit
} from '@/lib/hooks/useFeatureAccess';

// Components
import { FeatureGate } from '@/components/features/FeatureGate';
import { UpgradePrompt } from '@/components/features/UpgradePrompt';
import { PlanBadge } from '@/components/features/PlanBadge';

// Services (for advanced use)
import { FeatureFlagService } from '@/lib/features/feature-flags';
```

---

**That's it! You're ready to integrate your feature module with plan-based gating.**

If you run into issues, check the comprehensive documentation in `docs/FEATURE_GATING.md` or the implementation summary in `FEATURE_GATING_IMPLEMENTATION.md`.
