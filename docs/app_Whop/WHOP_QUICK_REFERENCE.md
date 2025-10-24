# Whop Integration - Quick Reference Card

## Environment Setup (30 seconds)

```bash
# 1. Generate encryption key
openssl rand -hex 32

# 2. Add to .env.local
WHOP_CLIENT_ID=oauth_xxxxx
WHOP_CLIENT_SECRET=sk_xxxxx
WHOP_WEBHOOK_SECRET=whsec_xxxxx
WHOP_TOKEN_ENCRYPTION_KEY=<output from step 1>
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 3. Run migration
supabase db push
```

---

## Common Code Patterns

### Check if User is Authenticated

```typescript
import { WhopAuthService } from '@/lib/whop/auth';

const isValid = await WhopAuthService.validateSession(whopUserId);
if (!isValid) {
  redirect('/login');
}
```

### Get User's Plan Tier

```typescript
import { MembershipValidator } from '@/lib/whop/membership';

const planTier = await MembershipValidator.getMembershipTier(userId);
// Returns: 'basic' | 'pro' | 'enterprise'
```

### Check Feature Access (via Agent 0)

```typescript
import { FeatureFlagService } from '@/lib/features/feature-flags';
import { Feature } from '@/lib/features/types';

const hasAccess = await FeatureFlagService.canAccessFeature(
  userId,
  Feature.FEATURE_QUIZZES
);
```

### Check Usage Limits

```typescript
import { MembershipValidator } from '@/lib/whop/membership';

const limits = await MembershipValidator.getMembershipLimits(userId);
const canUpload = await MembershipValidator.checkLimit(
  userId,
  'maxVideos',
  currentVideoCount
);

if (!canUpload) {
  return { error: 'Video limit reached', limit: limits.maxVideos };
}
```

### Initiate OAuth Login

```typescript
// In your login page/component
<Link href="/api/whop/auth">
  Sign in with Whop
</Link>
```

### Logout User

```typescript
await fetch('/api/whop/logout', { method: 'POST' });
window.location.href = '/login';
```

---

## Webhook Testing (Local Development)

```bash
# 1. Install ngrok
npm install -g ngrok

# 2. Start Next.js
npm run dev

# 3. Start ngrok
ngrok http 3000

# 4. Update Whop webhook URL
https://abc123.ngrok.io/api/whop/webhooks

# 5. Trigger test webhook from Whop dashboard
```

---

## Database Queries (Common)

### Check User's Membership

```sql
SELECT
  whop_user_id,
  membership_id,
  membership_valid,
  current_plan,
  plan_expires_at
FROM creators
WHERE whop_user_id = 'user_xxxxx';
```

### View Recent Webhooks

```sql
SELECT
  event_type,
  processed,
  error_message,
  created_at
FROM whop_webhook_events
ORDER BY created_at DESC
LIMIT 20;
```

### View Membership History

```sql
SELECT
  plan_tier,
  status,
  changed_from,
  changed_to,
  change_reason,
  created_at
FROM membership_history
WHERE whop_user_id = 'user_xxxxx'
ORDER BY created_at DESC;
```

---

## Troubleshooting (30 Seconds to Fix)

### "WHOP_TOKEN_ENCRYPTION_KEY is not configured"
```bash
openssl rand -hex 32 >> .env.local
```

### "Invalid webhook signature"
Check secret matches Whop dashboard:
```bash
echo $WHOP_WEBHOOK_SECRET
```

### "OAuth callback fails"
Verify redirect URI exact match:
```
Whop Dashboard: http://localhost:3000/api/whop/callback
.env.local: NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### "Token expired" errors
Tokens auto-refresh. Check database:
```sql
SELECT expires_at FROM creators WHERE whop_user_id = 'xxx';
```

### Webhook not processing
Check logs:
```sql
SELECT * FROM whop_webhook_events WHERE processed = false;
```

---

## Security Checklist (Before Production)

```
✅ WHOP_CLIENT_SECRET not in frontend code
✅ WHOP_TOKEN_ENCRYPTION_KEY is 64 hex chars
✅ All webhooks verify signature
✅ HTTPS enabled in production
✅ Session cookies are httpOnly
✅ CSRF state validation working
✅ No secrets in git history
✅ Error messages don't leak info
```

---

## File Locations

```
Services:
  lib/whop/auth.ts                 - OAuth & session management
  lib/whop/membership.ts           - Membership validation
  lib/whop/webhooks.ts             - Webhook processing
  lib/whop/plan-checker.ts         - Plan tier extraction

Database:
  supabase/migrations/20251020000007_whop_integration.sql

API Routes (to create):
  app/api/whop/auth/route.ts       - Start OAuth
  app/api/whop/callback/route.ts   - OAuth callback
  app/api/whop/webhooks/route.ts   - Webhook handler
  app/api/whop/verify/route.ts     - Verify session
  app/api/whop/logout/route.ts     - Logout

Middleware (to create):
  middleware.ts                     - Route protection

Docs:
  docs/WHOP_INTEGRATION_SUMMARY.md  - Complete overview
  docs/WHOP_SETUP_GUIDE.md          - Step-by-step setup
  WHOP_INTEGRATION_COMPLETE.md      - Deliverables summary
```

---

## API Endpoints

```
GET  /api/whop/auth           - Start OAuth flow
GET  /api/whop/callback       - OAuth redirect (code + state)
POST /api/whop/webhooks       - Receive Whop events
GET  /api/whop/verify         - Check session validity
POST /api/whop/logout         - Sign out user
```

---

## Cache Management

```typescript
// Invalidate user's membership cache (call on webhook)
import { MembershipValidator } from '@/lib/whop/membership';
MembershipValidator.invalidateCache(userId);

// Invalidate user's plan cache (call on plan change)
import { FeatureFlagService } from '@/lib/features/feature-flags';
FeatureFlagService.invalidateCache(userId);

// Cache stats (for debugging)
const stats = MembershipValidator.getCacheStats();
console.log(`Cache size: ${stats.size}, Keys: ${stats.keys}`);
```

---

## Plan Limits (Quick Reference)

| Feature | BASIC | PRO | ENTERPRISE |
|---------|-------|-----|------------|
| Videos | 50 | 500 | Unlimited |
| Students | 100 | 1,000 | Unlimited |
| Storage | 10GB | 100GB | Unlimited |
| Projects | 10 | 50 | Unlimited |
| Quizzes | 20 | 100 | Unlimited |
| AI Messages/mo | 1,000 | 10,000 | Unlimited |
| Custom Branding | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ✅ | ✅ |

---

## TypeScript Types

```typescript
import type {
  WhopSession,
  WhopUser,
  WhopMembership,
  WhopWebhookPayload
} from '@/types/whop';

import {
  PlanTier,
  Feature
} from '@/lib/features/types';

import type {
  MembershipValidationResult,
  MembershipDetails,
  UsageLimits
} from '@/lib/whop/membership';
```

---

## Test Commands (When Tests Written)

```bash
npm test                          # Run all tests
npm run test:watch               # Watch mode
npm run test:integration         # Integration tests
npm run test:security            # Security tests
```

---

## Monitoring Queries

### Auth Success Rate

```sql
SELECT
  COUNT(*) FILTER (WHERE event_type = 'auth_login_success') as successes,
  COUNT(*) FILTER (WHERE event_type = 'auth_login_failed') as failures,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'auth_login_success')::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as success_rate
FROM analytics_events
WHERE event_type IN ('auth_login_success', 'auth_login_failed')
AND created_at > NOW() - INTERVAL '7 days';
```

### Webhook Processing Health

```sql
SELECT
  event_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE processed = true) as processed,
  COUNT(*) FILTER (WHERE processed = false) as pending,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as errors
FROM whop_webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY total DESC;
```

---

## Need Help?

1. **Setup Issues**: See `docs/WHOP_SETUP_GUIDE.md`
2. **Integration**: See `docs/WHOP_INTEGRATION_SUMMARY.md`
3. **Security**: See Security Checklist in both docs
4. **Whop Docs**: https://docs.whop.com

---

**Quick Start**: Follow WHOP_SETUP_GUIDE.md (10 minutes to complete setup)
