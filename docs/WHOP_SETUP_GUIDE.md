# Whop Integration - Complete Setup Guide

## Step-by-Step Configuration Guide

This guide will walk you through setting up the Whop integration from start to finish.

---

## Prerequisites

- Whop developer account
- Whop product created
- Next.js project initialized
- Supabase database configured

---

## Step 1: Configure Whop Dashboard

### 1.1 Create OAuth Application

1. Go to https://dash.whop.com
2. Navigate to **Developers** → **OAuth Apps**
3. Click **Create OAuth App**
4. Fill in details:
   - **Name**: Video Wizard (or your app name)
   - **Redirect URI**: `http://localhost:3000/api/whop/callback` (dev)
   - **Production Redirect URI**: `https://your-domain.com/api/whop/callback`
   - **Scopes**: Select `openid`, `profile`, `email`, `memberships`

5. Click **Create**
6. Copy **Client ID** and **Client Secret** (keep secret safe!)

### 1.2 Configure Webhooks

1. Go to **Developers** → **Webhooks**
2. Click **Create Webhook**
3. Fill in details:
   - **Endpoint URL**: `https://your-domain.com/api/whop/webhooks`
   - **Events to Subscribe**:
     - `membership.created`
     - `membership.went_valid`
     - `membership.went_invalid`
     - `membership.deleted`
     - `payment.succeeded`
     - `payment.failed`

4. Click **Create**
5. Copy **Webhook Secret** (you'll need this)

### 1.3 Get API Key

1. Go to **Developers** → **API Keys**
2. Click **Create API Key**
3. Name it "Production API Key"
4. Copy the key (won't be shown again!)

### 1.4 Configure Products & Plans

1. Create your products (Basic, Pro, Enterprise)
2. Set pricing for each plan
3. Note down the **Plan IDs** for each tier

---

## Step 2: Configure Environment Variables

### 2.1 Generate Encryption Key

Run this command to generate a secure encryption key:

```bash
openssl rand -hex 32
```

Copy the output (64 hex characters).

### 2.2 Create `.env.local` File

Create `.env.local` in your project root:

```bash
# Whop OAuth Configuration
WHOP_CLIENT_ID=oauth_xxxxxxxxxxxxx
WHOP_CLIENT_SECRET=sk_xxxxxxxxxxxxx
WHOP_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
WHOP_API_KEY=whop_xxxxxxxxxxxxx

# Token Encryption (from Step 2.1)
WHOP_TOKEN_ENCRYPTION_KEY=your_64_character_hex_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
WHOP_OAUTH_REDIRECT_URI=${NEXT_PUBLIC_APP_URL}/api/whop/callback

# Plan Checkout URLs (optional, from Whop dashboard)
NEXT_PUBLIC_WHOP_BASIC_CHECKOUT_URL=https://whop.com/checkout/plan_xxxxx
NEXT_PUBLIC_WHOP_PRO_CHECKOUT_URL=https://whop.com/checkout/plan_xxxxx
NEXT_PUBLIC_WHOP_ENTERPRISE_CHECKOUT_URL=https://whop.com/checkout/plan_xxxxx

# Supabase (should already be configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2.3 Update `.env.example`

Add the Whop variables to `.env.example` (without actual values):

```bash
# Whop Integration
WHOP_CLIENT_ID=
WHOP_CLIENT_SECRET=
WHOP_WEBHOOK_SECRET=
WHOP_API_KEY=
WHOP_TOKEN_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 3: Run Database Migration

### 3.1 Apply Migration

```bash
# Using Supabase CLI
supabase db push

# Or run the SQL file directly in Supabase dashboard
# Copy contents of: supabase/migrations/20251020000007_whop_integration.sql
```

### 3.2 Verify Tables Created

Check that these tables exist:
- `whop_webhook_events`
- `membership_history`
- Updated `creators` table with new columns

Run this query in Supabase SQL editor:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'creators'
AND column_name IN (
  'membership_id',
  'membership_valid',
  'current_plan',
  'plan_expires_at',
  'access_token',
  'refresh_token',
  'expires_at'
);
```

You should see all 7 columns.

---

## Step 4: Configure Plan ID Mapping

### 4.1 Identify Your Plan IDs

From Whop dashboard, note your actual plan IDs:
- Basic plan ID: `plan_xxxxxxxx`
- Pro plan ID: `plan_yyyyyyyy`
- Enterprise plan ID: `plan_zzzzzzzz`

### 4.2 Update Plan Checker

Edit `lib/whop/plan-checker.ts` to add your plan IDs:

```typescript
// At app initialization (e.g., in _app.tsx or layout.tsx)
import { WhopPlanChecker } from '@/lib/whop/plan-checker';

WhopPlanChecker.configurePlanMapping({
  basic: ['plan_xxxxxxxx', 'basic', 'starter'],
  pro: ['plan_yyyyyyyy', 'pro', 'professional'],
  enterprise: ['plan_zzzzzzzz', 'enterprise', 'business'],
});
```

Or add them directly in the file:

```typescript
const DEFAULT_PLAN_PATTERNS: PlanIdMapping = {
  basic: ['plan_xxxxxxxx', 'plan_basic', 'plan_starter', 'basic'],
  pro: ['plan_yyyyyyyy', 'plan_pro', 'professional', 'pro'],
  enterprise: ['plan_zzzzzzzz', 'plan_enterprise', 'plan_business', 'enterprise'],
};
```

---

## Step 5: Create API Routes

Create the following files in your Next.js app:

### 5.1 OAuth Initiation Route

**File**: `app/api/whop/auth/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WhopAuthService } from '@/lib/whop/auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/whop/callback`;

    // Generate CSRF state
    const state = WhopAuthService.generateState();

    // Store state in cookie for verification
    cookies().set('whop_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    // Generate authorization URL
    const authUrl = WhopAuthService.getAuthorizationUrl(redirectUri, state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth initiation failed:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}
```

### 5.2 OAuth Callback Route

**File**: `app/api/whop/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WhopAuthService } from '@/lib/whop/auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/login?error=missing_params', req.url)
      );
    }

    // Verify CSRF state
    const storedState = cookies().get('whop_oauth_state')?.value;

    if (!storedState || !WhopAuthService.verifyState(state, storedState)) {
      console.error('CSRF state validation failed');
      return NextResponse.redirect(
        new URL('/login?error=invalid_state', req.url)
      );
    }

    // Clear state cookie
    cookies().delete('whop_oauth_state');

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/whop/callback`;
    const session = await WhopAuthService.handleCallback(code, redirectUri);

    // Set session cookie (httpOnly for security)
    cookies().set('whop_session', session.userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', req.url));
  } catch (error) {
    console.error('OAuth callback failed:', error);
    return NextResponse.redirect(
      new URL('/login?error=auth_failed', req.url)
    );
  }
}
```

### 5.3 Webhook Handler Route

**File**: `app/api/whop/webhooks/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WhopWebhookHandler } from '@/lib/whop/webhooks';
import type { WhopWebhookPayload } from '@/types/whop';

export async function POST(req: NextRequest) {
  try {
    // Get webhook signature and timestamp from headers
    const signature = req.headers.get('x-whop-signature');
    const timestamp = req.headers.get('x-whop-timestamp');

    if (!signature || !timestamp) {
      console.error('Missing webhook signature or timestamp');
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();

    // Verify signature (CRITICAL FOR SECURITY)
    const isValid = WhopWebhookHandler.verifySignature(
      rawBody,
      signature,
      timestamp
    );

    if (!isValid) {
      console.error('Webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Verify timestamp to prevent replay attacks
    const isTimestampValid = WhopWebhookHandler.verifyTimestamp(timestamp);

    if (!isTimestampValid) {
      console.error('Webhook timestamp invalid');
      return NextResponse.json(
        { error: 'Invalid timestamp' },
        { status: 400 }
      );
    }

    // Parse webhook payload
    const payload: WhopWebhookPayload = JSON.parse(rawBody);

    // Handle webhook event
    const result = await WhopWebhookHandler.handleWebhook(payload);

    if (!result.success) {
      // Return 500 so Whop retries
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    // Return 200 OK
    return NextResponse.json({ success: true, processed: result.processed });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

### 5.4 Session Verification Route

**File**: `app/api/whop/verify/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WhopAuthService } from '@/lib/whop/auth';
import { MembershipValidator } from '@/lib/whop/membership';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = cookies().get('whop_session');

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const whopUserId = sessionCookie.value;

    // Validate session
    const isValid = await WhopAuthService.validateSession(whopUserId);

    if (!isValid) {
      // Clear invalid session
      cookies().delete('whop_session');
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    // Get membership details
    const membership = await MembershipValidator.getMembershipDetails(whopUserId);

    return NextResponse.json({
      authenticated: true,
      userId: whopUserId,
      membership,
    });
  } catch (error) {
    console.error('Session verification failed:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
```

### 5.5 Logout Route

**File**: `app/api/whop/logout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WhopAuthService } from '@/lib/whop/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = cookies().get('whop_session');

    if (sessionCookie) {
      const whopUserId = sessionCookie.value;

      // Sign out and revoke tokens
      await WhopAuthService.signOut(whopUserId);

      // Clear session cookie
      cookies().delete('whop_session');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout failed:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
```

---

## Step 6: Create Middleware for Route Protection

**File**: `middleware.ts` (in project root)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WhopAuthService } from '@/lib/whop/auth';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public routes (no auth needed)
  const publicRoutes = [
    '/',
    '/login',
    '/pricing',
    '/api/whop/auth',
    '/api/whop/callback',
    '/api/whop/webhooks',
  ];

  // Check if path starts with any public route
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie = request.cookies.get('whop_session');

  if (!sessionCookie) {
    // Redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Validate session
  try {
    const whopUserId = sessionCookie.value;
    const isValid = await WhopAuthService.validateSession(whopUserId);

    if (!isValid) {
      // Clear cookie and redirect
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('whop_session');
      return response;
    }

    // Add user ID to request headers for downstream use
    const response = NextResponse.next();
    response.headers.set('X-Whop-User-Id', whopUserId);

    return response;
  } catch (error) {
    console.error('Middleware validation failed:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/creator/:path*',
    '/api/student/:path*',
  ],
};
```

---

## Step 7: Test the Integration

### 7.1 Test OAuth Flow

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000/api/whop/auth`
3. Should redirect to Whop login
4. Authenticate with Whop account
5. Should redirect back to `/dashboard`
6. Check database for new user in `creators` table

### 7.2 Test Webhooks Locally

Use ngrok to expose local webhook endpoint:

```bash
# Install ngrok
npm install -g ngrok

# Start tunnel
ngrok http 3000

# Copy ngrok URL (e.g., https://abc123.ngrok.io)
# Update Whop webhook endpoint to: https://abc123.ngrok.io/api/whop/webhooks
```

Then trigger a webhook from Whop dashboard to test.

### 7.3 Verify Token Encryption

Check database that tokens are encrypted (should not be readable):

```sql
SELECT access_token, refresh_token
FROM creators
WHERE whop_user_id = 'your_test_user_id';
```

Tokens should look like: `hex:hex:hex` (encrypted format)

---

## Step 8: Security Checklist

Before going to production, verify:

- [ ] `WHOP_CLIENT_SECRET` never exposed to frontend
- [ ] `WHOP_TOKEN_ENCRYPTION_KEY` is 64 hex characters
- [ ] All webhook signatures are verified
- [ ] HTTPS enabled in production
- [ ] Session cookies are httpOnly
- [ ] CSRF state validation working
- [ ] Token auto-refresh implemented
- [ ] All secrets in environment variables
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting configured (future step)

---

## Step 9: Deploy to Production

### 9.1 Configure Production Environment Variables

In Vercel/your hosting platform:

1. Add all environment variables from `.env.local`
2. Update `NEXT_PUBLIC_APP_URL` to production domain
3. Update `WHOP_OAUTH_REDIRECT_URI` to production callback URL

### 9.2 Update Whop Dashboard

1. Add production redirect URI to OAuth app
2. Update webhook endpoint to production URL
3. Test webhook delivery in Whop dashboard

### 9.3 Run Database Migration

Apply migration to production database:

```bash
supabase db push --db-url "your_production_db_url"
```

---

## Troubleshooting

### "WHOP_TOKEN_ENCRYPTION_KEY is not configured"
Generate key: `openssl rand -hex 32`

### "Invalid signature" on webhooks
Verify `WHOP_WEBHOOK_SECRET` matches Whop dashboard

### OAuth callback fails
Check redirect URI matches exactly in Whop dashboard

### Tokens not refreshing
Check `expires_at` in database, should auto-refresh 5 min before

---

## Next Steps

1. Implement React hooks for frontend
2. Create UI components (login button, auth guard, etc.)
3. Write comprehensive tests
4. Add rate limiting to API routes
5. Setup monitoring and alerts

---

## Support

- Whop Docs: https://docs.whop.com
- Whop Discord: https://discord.gg/whop
- GitHub Issues: [Your repo]

---

**Setup Complete!** 🎉

Your Whop integration is now configured and ready to use.
