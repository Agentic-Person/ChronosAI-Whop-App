# Module 7: Whop Integration - Implementation Guide

## ⚠️ SECURITY WARNING

This module handles authentication and payment data. **Follow security guidelines exactly** or risk compromising user data and business integrity.

## Prerequisites

- [ ] Whop developer account created at [whop.com/developers](https://whop.com/developers)
- [ ] App registered in Whop dashboard
- [ ] OAuth client ID and secret obtained
- [ ] Webhook secret configured
- [ ] Test environment set up

## Phase 1: Whop Developer Setup

### Step 1.1: Create Whop App

1. **Go to Whop Developer Portal**: [https://whop.com/developers](https://whop.com/developers)
2. **Create New App**:
   - App Name: "Mentora"
   - Description: "AI-powered video learning platform"
   - Website: Your app URL
   - Privacy Policy: Link to your privacy policy
   - Terms of Service: Link to your ToS

3. **Configure OAuth Settings**:
   - Redirect URIs:
     - Development: `http://localhost:3000/api/whop/callback`
     - Production: `https://your-domain.com/api/whop/callback`
   - Scopes:
     - `user:read` - Read user profile
     - `membership:read` - Check membership status
     - `payment:read` - View payment history (optional)

4. **Get Credentials**:
   - Copy **Client ID**
   - Copy **Client Secret** (**keep this secret!**)
   - Generate **Webhook Secret**

5. **Add to .env**:
   ```env
   WHOP_API_KEY=whop_xxxxxxxxxxxxx
   WHOP_CLIENT_ID=client_xxxxxxxxxxxxx
   WHOP_CLIENT_SECRET=secret_xxxxxxxxxxxxx
   WHOP_WEBHOOK_SECRET=webhook_xxxxxxxxxxxxx
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## Phase 2: OAuth Implementation

### Step 2.1: Create Auth Service

```typescript
// lib/whop/auth-service.ts

import { cookies } from 'next/headers';

interface WhopTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

interface WhopUser {
  id: string;
  email: string;
  name: string;
  username: string;
  profile_pic_url?: string;
}

export class WhopAuthService {
  private readonly clientId = process.env.WHOP_CLIENT_ID!;
  private readonly clientSecret = process.env.WHOP_CLIENT_SECRET!;
  private readonly redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/whop/callback`;
  private readonly apiKey = process.env.WHOP_API_KEY!;

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'user:read membership:read',
      state, // CSRF protection
    });

    return `https://whop.com/oauth/authorize?${params}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<WhopTokens> {
    const response = await fetch('https://api.whop.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<WhopTokens> {
    const response = await fetch('https://api.whop.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get user profile from Whop
   */
  async getUserProfile(accessToken: string): Promise<WhopUser> {
    const response = await fetch('https://api.whop.com/api/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user profile: ${error}`);
    }

    return response.json();
  }

  /**
   * Store tokens in secure httpOnly cookies
   */
  setTokenCookies(tokens: WhopTokens): void {
    const cookieStore = cookies();

    cookieStore.set('whop_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
      path: '/',
    });

    cookieStore.set('whop_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
  }

  /**
   * Get access token from cookies
   */
  getAccessToken(): string | undefined {
    const cookieStore = cookies();
    return cookieStore.get('whop_access_token')?.value;
  }

  /**
   * Clear auth cookies (logout)
   */
  clearTokens(): void {
    const cookieStore = cookies();
    cookieStore.delete('whop_access_token');
    cookieStore.delete('whop_refresh_token');
  }
}

export const whopAuth = new WhopAuthService();
```

### Step 2.2: Create OAuth Routes

```typescript
// app/api/whop/auth/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { whopAuth } from '@/lib/whop/auth-service';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  // Generate CSRF state token
  const state = crypto.randomBytes(32).toString('hex');

  // Store state in session/cookie for verification
  const response = NextResponse.redirect(whopAuth.getAuthUrl(state));

  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
```

```typescript
// app/api/whop/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { whopAuth } from '@/lib/whop/auth-service';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const storedState = req.cookies.get('oauth_state')?.value;

    // Verify CSRF state
    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_state', req.url)
      );
    }

    // Exchange code for tokens
    const tokens = await whopAuth.exchangeCodeForTokens(code!);

    // Get user profile
    const whopUser = await whopAuth.getUserProfile(tokens.access_token);

    // Check if user is a creator or student (based on membership)
    const memberships = await fetchUserMemberships(whopUser.id);

    // Create or update user in database
    if (isCreator(memberships)) {
      await createOrUpdateCreator(whopUser);
    } else {
      await createOrUpdateStudent(whopUser, memberships[0]);
    }

    // Store tokens
    whopAuth.setTokenCookies(tokens);

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', req.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=auth_failed', req.url)
    );
  }
}

async function fetchUserMemberships(userId: string) {
  const response = await fetch(
    `https://api.whop.com/api/v2/memberships?user_id=${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
      },
    }
  );

  if (!response.ok) throw new Error('Failed to fetch memberships');

  const data = await response.json();
  return data.data || [];
}

function isCreator(memberships: any[]): boolean {
  // Check if user has creator-level membership
  return memberships.some(m => m.product_id === process.env.WHOP_CREATOR_PRODUCT_ID);
}

async function createOrUpdateCreator(whopUser: any) {
  const supabase = getSupabaseAdmin();

  await supabase.from('creators').upsert({
    whop_user_id: whopUser.id,
    email: whopUser.email,
    name: whopUser.name,
    username: whopUser.username,
    avatar_url: whopUser.profile_pic_url,
    updated_at: new Date().toISOString(),
  });
}

async function createOrUpdateStudent(whopUser: any, membership: any) {
  const supabase = getSupabaseAdmin();

  // Find creator from membership's company_id
  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('whop_company_id', membership.company_id)
    .single();

  if (!creator) {
    throw new Error('Creator not found for this membership');
  }

  await supabase.from('students').upsert({
    whop_user_id: whopUser.id,
    whop_membership_id: membership.id,
    creator_id: creator.id,
    email: whopUser.email,
    name: whopUser.name,
    updated_at: new Date().toISOString(),
  });
}
```

## Phase 3: Webhook Implementation

### Step 3.1: Create Webhook Verifier

```typescript
// lib/whop/webhook-service.ts

import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';

interface WhopWebhookEvent {
  id: string;
  event: string;
  data: any;
  timestamp: string;
  signature: string;
}

export class WhopWebhookService {
  private readonly secret = process.env.WHOP_WEBHOOK_SECRET!;

  /**
   * Verify webhook signature (CRITICAL FOR SECURITY)
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!signature) return false;

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');

    const expected = `sha256=${expectedSignature}`;

    // Timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  }

  /**
   * Process webhook event
   */
  async processEvent(event: WhopWebhookEvent): Promise<void> {
    // Check if event already processed (idempotency)
    const processed = await this.isEventProcessed(event.id);

    if (processed) {
      console.log('Event already processed:', event.id);
      return;
    }

    try {
      // Route to appropriate handler
      switch (event.event) {
        case 'membership.created':
          await this.handleMembershipCreated(event.data);
          break;

        case 'membership.expired':
          await this.handleMembershipExpired(event.data);
          break;

        case 'membership.cancelled':
          await this.handleMembershipCancelled(event.data);
          break;

        case 'payment.succeeded':
          await this.handlePaymentSucceeded(event.data);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(event.data);
          break;

        default:
          console.log('Unhandled event type:', event.event);
      }

      // Mark event as processed
      await this.markEventProcessed(event.id);
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw error; // Whop will retry
    }
  }

  /**
   * Handle membership creation
   */
  private async handleMembershipCreated(data: any): Promise<void> {
    const supabase = getSupabaseAdmin();

    // Get creator from company_id
    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('whop_company_id', data.company_id)
      .single();

    if (!creator) {
      console.error('Creator not found:', data.company_id);
      return;
    }

    // Create student record
    await supabase.from('students').insert({
      whop_user_id: data.user_id,
      whop_membership_id: data.id,
      creator_id: creator.id,
      onboarding_completed: false,
    });

    // Send welcome email
    // await sendWelcomeEmail(data.user_id);

    console.log('Student created:', data.user_id);
  }

  /**
   * Handle membership expiration
   */
  private async handleMembershipExpired(data: any): Promise<void> {
    const supabase = getSupabaseAdmin();

    // Mark student as inactive
    await supabase
      .from('students')
      .update({
        membership_status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('whop_membership_id', data.id);

    // Send renewal reminder
    // await sendRenewalEmail(data.user_id);

    console.log('Membership expired:', data.id);
  }

  /**
   * Handle membership cancellation
   */
  private async handleMembershipCancelled(data: any): Promise<void> {
    const supabase = getSupabaseAdmin();

    await supabase
      .from('students')
      .update({
        membership_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('whop_membership_id', data.id);

    console.log('Membership cancelled:', data.id);
  }

  /**
   * Handle payment success
   */
  private async handlePaymentSucceeded(data: any): Promise<void> {
    // Log payment for analytics
    await getSupabaseAdmin()
      .from('analytics_events')
      .insert({
        event_type: 'payment_succeeded',
        event_data: data,
      });

    console.log('Payment succeeded:', data.id);
  }

  /**
   * Handle payment failure
   */
  private async handlePaymentFailed(data: any): Promise<void> {
    // Alert creator
    // await alertCreatorPaymentFailed(data);

    console.log('Payment failed:', data.id);
  }

  /**
   * Check if event was already processed
   */
  private async isEventProcessed(eventId: string): Promise<boolean> {
    const { data } = await getSupabaseAdmin()
      .from('processed_webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .single();

    return !!data;
  }

  /**
   * Mark event as processed
   */
  private async markEventProcessed(eventId: string): Promise<void> {
    await getSupabaseAdmin()
      .from('processed_webhook_events')
      .insert({
        event_id: eventId,
        processed_at: new Date().toISOString(),
      });
  }
}

export const whopWebhooks = new WhopWebhookService();
```

### Step 3.2: Create Webhook Route

```typescript
// app/api/whop/webhooks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { whopWebhooks } from '@/lib/whop/webhook-service';

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('whop-signature') || '';

    // Verify signature
    const isValid = whopWebhooks.verifySignature(body, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse event
    const event = JSON.parse(body);

    // Process event (async to respond quickly)
    whopWebhooks.processEvent(event).catch(error => {
      console.error('Webhook processing failed:', error);
    });

    // Respond immediately to Whop
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

### Step 3.3: Create Processed Events Table

```sql
-- supabase/migrations/20251020000003_webhook_events.sql

CREATE TABLE processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_processed_events_id ON processed_webhook_events(event_id);
```

## Phase 4: Membership Validation

### Step 4.1: Create Membership Validator

```typescript
// lib/whop/membership-validator.ts

interface MembershipValidation {
  valid: boolean;
  reason?: 'NO_MEMBERSHIP' | 'EXPIRED' | 'INACTIVE' | 'CANCELLED';
  tier?: string;
  expiresAt?: string;
}

export class MembershipValidator {
  /**
   * Validate user's membership
   */
  async validateMembership(userId: string): Promise<MembershipValidation> {
    // Get student record
    const { data: student } = await getSupabaseAdmin()
      .from('students')
      .select('whop_membership_id, membership_status')
      .eq('whop_user_id', userId)
      .single();

    if (!student) {
      return { valid: false, reason: 'NO_MEMBERSHIP' };
    }

    // Check local status first (fast)
    if (student.membership_status === 'cancelled') {
      return { valid: false, reason: 'CANCELLED' };
    }

    if (student.membership_status === 'expired') {
      return { valid: false, reason: 'EXPIRED' };
    }

    // Verify with Whop API (cached)
    const membership = await this.checkWhopMembership(
      student.whop_membership_id
    );

    if (!membership || !membership.valid) {
      return { valid: false, reason: 'INACTIVE' };
    }

    return {
      valid: true,
      tier: membership.tier,
      expiresAt: membership.expires_at,
    };
  }

  /**
   * Check membership status with Whop API
   */
  private async checkWhopMembership(
    membershipId: string
  ): Promise<any> {
    // Check cache first
    const cacheKey = `membership:${membershipId}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Call Whop API
    const response = await fetch(
      `https://api.whop.com/api/v2/memberships/${membershipId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const membership = await response.json();

    // Cache for 5 minutes
    await cache.set(cacheKey, membership, 300);

    return membership;
  }
}

export const membershipValidator = new MembershipValidator();
```

## Phase 5: Auth Middleware

### Step 5.1: Create Middleware

```typescript
// middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { whopAuth } from '@/lib/whop/auth-service';
import { membershipValidator } from '@/lib/whop/membership-validator';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public routes (no auth needed)
  const publicRoutes = [
    '/',
    '/login',
    '/api/whop/auth',
    '/api/whop/callback',
    '/api/whop/webhooks',
  ];

  if (publicRoutes.some(route => path.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for access token
  const accessToken = request.cookies.get('whop_access_token')?.value;

  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Get user profile
    const user = await whopAuth.getUserProfile(accessToken);

    // Validate membership
    const validation = await membershipValidator.validateMembership(user.id);

    if (!validation.valid) {
      return NextResponse.redirect(
        new URL(`/login?error=membership_${validation.reason?.toLowerCase()}`, request.url)
      );
    }

    // Add user data to request headers
    const response = NextResponse.next();
    response.headers.set('X-User-Id', user.id);
    response.headers.set('X-User-Email', user.email);

    return response;
  } catch (error) {
    console.error('Middleware auth error:', error);

    // Try refresh token
    const refreshToken = request.cookies.get('whop_refresh_token')?.value;

    if (refreshToken) {
      try {
        const tokens = await whopAuth.refreshToken(refreshToken);
        whopAuth.setTokenCookies(tokens);
        return NextResponse.next();
      } catch {
        // Refresh failed, redirect to login
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
};
```

## Phase 6: Testing

### Test OAuth Flow

```bash
# 1. Start dev server
npm run dev

# 2. Navigate to http://localhost:3000/api/whop/auth
# 3. Complete OAuth flow on Whop
# 4. Should redirect back to /dashboard
# 5. Check cookies in DevTools
```

### Test Webhook Locally

Use [ngrok](https://ngrok.com) to expose local server:

```bash
# Install ngrok
npm install -g ngrok

# Start tunnel
ngrok http 3000

# Copy HTTPS URL (e.g., https://abc123.ngrok.io)
# Add to Whop webhook settings: https://abc123.ngrok.io/api/whop/webhooks

# Trigger test webhook from Whop dashboard
# Check server logs
```

### Test Signature Verification

```typescript
// scripts/test-webhook-signature.ts

import crypto from 'crypto';

const secret = 'your_webhook_secret';
const payload = JSON.stringify({ test: true });

const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

console.log('Signature:', `sha256=${signature}`);

// Use this to test webhook endpoint with curl
```

## Security Checklist

Before going to production:

- [ ] **Environment variables secured** (not in git)
- [ ] **Webhook signature verification** implemented and tested
- [ ] **HTTPS enabled** in production
- [ ] **CSRF protection** (state parameter) working
- [ ] **httpOnly cookies** for tokens
- [ ] **Secure cookie flag** enabled in production
- [ ] **Rate limiting** on auth endpoints
- [ ] **Membership validation** on every request
- [ ] **Token refresh** logic working
- [ ] **Error messages** don't leak sensitive info
- [ ] **Audit logging** for auth events
- [ ] **Test with expired/invalid tokens**

---

**⚠️ This module is CRITICAL - test thoroughly!** 🔒
