# Whop Deployment Quick Reference

**Purpose:** Fast checklist for deploying Whop OAuth apps to Vercel
**Time to Review:** 5 minutes
**Estimated Deployment Time:** 80 minutes (following this guide)

---

## 🚨 THE ONE THING THAT WILL SAVE YOU 2+ HOURS

**ALWAYS use `printf` instead of `echo` when setting Vercel environment variables:**

```bash
# ✅ CORRECT - No trailing newline
printf 'app_p2sU9MQCeFnT4o' | vercel env add WHOP_CLIENT_ID production

# ❌ WRONG - Adds newline → causes %0A in OAuth URLs → "Invalid client_id"
echo "app_p2sU9MQCeFnT4o" | vercel env add WHOP_CLIENT_ID production
```

---

## 🎯 The 10 Golden Rules

1. **Read Documentation First** - 30 min reading saves 3 hours debugging
2. **Use `printf`, Never `echo`** - For all Vercel environment variables
3. **Copy from Documentation** - Use SDK methods, don't reinvent OAuth
4. **Deploy MVP First** - OAuth only, add features after validation
5. **Use `<a>` Tags for OAuth** - Not `<Link>` (causes CORS errors)
6. **Match Redirect URIs Exactly** - One character difference = failure
7. **Test OAuth URLs for Encoding** - `%0A` = newline = broken OAuth
8. **One Redirect URI Per Environment** - Development vs Production
9. **Disable TypeScript for MVP** - Fix types after OAuth works
10. **Follow the Workflow** - Pre-dev → Dev → Test → Deploy → Validate

---

## 📋 Pre-Development Checklist (30 min)

### Documentation Review
- [ ] Read Whop OAuth guide: `docs/app_Whop/whop_add_app_commands.md` lines 835-1016
- [ ] Review SDK examples: lines 888-918 (login), 937-994 (callback)
- [ ] Note environment variables: lines 857-864

### Whop Dashboard Setup
- [ ] Go to [Whop Developer Dashboard](https://whop.com/dashboard/developer/)
- [ ] Create new app
- [ ] Copy App ID: `app_xxxxxxxxxxxxx`
- [ ] Copy API Key: `your_api_key_here` (keep secret!)
- [ ] Add localhost redirect: `http://localhost:3008/api/whop/auth/callback`
- [ ] Configure permissions (start with `read_user`)

### Environment Variables Setup
- [ ] Create `.env.local`:
  ```bash
  NEXT_PUBLIC_WHOP_APP_ID=app_xxxxxxxxxxxxx
  WHOP_API_KEY=your_api_key_here
  WHOP_OAUTH_REDIRECT_URI=http://localhost:3008/api/whop/auth/callback
  NEXT_PUBLIC_APP_URL=http://localhost:3008
  ```

---

## 💻 Development Checklist (60 min)

### Install Dependencies
```bash
npm install @whop/api
```

### Create OAuth Routes

**Login Route:** `app/api/whop/auth/login/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WhopServerSdk } from '@whop/api';

const whopApi = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY!,
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
});

export async function GET(req: NextRequest) {
  const { url, state } = whopApi.oauth.getAuthorizationUrl({
    redirectUri: process.env.WHOP_OAUTH_REDIRECT_URI!,
    scope: ['read_user'],
  });

  const response = NextResponse.redirect(url);
  response.cookies.set('whop_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
```

**Callback Route:** `app/api/whop/auth/callback/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WhopServerSdk } from '@whop/api';

const whopApi = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY!,
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
});

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  // Validate state
  const storedState = req.cookies.get('whop_oauth_state')?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL('/?error=invalid_state', req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', req.url));
  }

  // Exchange code for token
  const authResponse = await whopApi.oauth.exchangeCode({
    code,
    redirectUri: process.env.WHOP_OAUTH_REDIRECT_URI!,
  });

  if (!authResponse.ok) {
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', req.url));
  }

  const { access_token } = authResponse.tokens;

  // Set cookie and redirect
  const response = NextResponse.redirect(new URL('/dashboard', req.url));
  response.cookies.set('whop_access_token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return response;
}
```

### Add Login Button
```tsx
// app/page.tsx
// ⚠️ Use <a> tag, NOT <Link>
<a href="/api/whop/auth/login">
  <button>Login with Whop</button>
</a>
```

### Create Dashboard
```tsx
// app/dashboard/page.tsx
export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Successfully logged in!</p>
    </div>
  );
}
```

### Local Testing
- [ ] `PORT=3008 npm run dev`
- [ ] Click "Login with Whop"
- [ ] Verify redirect to Whop
- [ ] Verify redirect back to `/dashboard`
- [ ] Check access token in browser cookies

---

## 🚀 Pre-Deployment Checklist (15 min)

### Whop Dashboard Production Setup
- [ ] Add production redirect URI: `https://your-app.vercel.app/api/whop/auth/callback`
- [ ] Remove or keep localhost redirect (your choice)
- [ ] Verify only intended redirect URIs are active

### Create Vercel Environment Script

**Create `vercel-env-setup.sh`:**
```bash
#!/bin/bash

# ⚠️ CRITICAL: Use printf, NOT echo!

printf 'app_xxxxxxxxxxxxx' | vercel env add NEXT_PUBLIC_WHOP_APP_ID production
printf 'your_api_key' | vercel env add WHOP_API_KEY production
printf 'https://your-app.vercel.app/api/whop/auth/callback' | vercel env add WHOP_OAUTH_REDIRECT_URI production
printf 'https://your-app.vercel.app' | vercel env add NEXT_PUBLIC_APP_URL production

# Whop IDs (if needed)
printf 'biz_xxxxxxxxxxxxx' | vercel env add NEXT_PUBLIC_WHOP_COMPANY_ID production
printf 'user_xxxxxxxxxxxxx' | vercel env add NEXT_PUBLIC_WHOP_AGENT_USER_ID production

# Secrets (same as app ID and API key)
printf 'app_xxxxxxxxxxxxx' | vercel env add WHOP_CLIENT_ID production
printf 'your_api_key' | vercel env add WHOP_CLIENT_SECRET production

echo "✅ Environment variables set!"
```

### Deployment Scope (MVP Only)

**Create `.vercelignore`:**
```
# Exclude non-OAuth features for MVP
lib/tokens/
app/api/tokens/
lib/discord/
app/api/discord/
lib/video/
app/api/video/
app/api/creator/
```

### TypeScript Configuration (If Needed)

**Edit `next.config.mjs`:**
```javascript
const nextConfig = {
  typescript: { ignoreBuildErrors: true },  // Remove after fixing
  eslint: { ignoreDuringBuilds: true },     // Remove after fixing
};
```

---

## 🎯 Deployment Checklist (10 min)

### Run Environment Setup
```bash
chmod +x vercel-env-setup.sh
./vercel-env-setup.sh
```

### Deploy
```bash
vercel --prod
```

### Post-Deployment Validation
- [ ] Visit production URL
- [ ] Click "Login with Whop"
- [ ] **Check OAuth URL for `%0A`** (indicates newline in env var)
- [ ] Verify Whop authorization page loads
- [ ] Click "Approve"
- [ ] Verify redirect to `/dashboard`
- [ ] Check browser Network tab for errors
- [ ] Verify access token in cookies

---

## 🔧 Quick Troubleshooting

### Error: "Invalid client_id"

**Check for URL encoding issues:**
```
https://whop.com/oauth/?client_id=app_p2sU9MQCeFnT4o%0A
                                                    ^^^^ NEWLINE!
```

**Fix:**
```bash
echo "y" | vercel env rm WHOP_CLIENT_ID production
echo "y" | vercel env rm NEXT_PUBLIC_WHOP_APP_ID production

printf 'app_p2sU9MQCeFnT4o' | vercel env add WHOP_CLIENT_ID production
printf 'app_p2sU9MQCeFnT4o' | vercel env add NEXT_PUBLIC_WHOP_APP_ID production

vercel --prod
```

---

### Error: "Failed to exchange code for token"

**Causes:**
1. Redirect URI mismatch
2. Client secret has newline
3. Not using SDK method

**Fix:**
```bash
# Re-add client secret with printf
echo "y" | vercel env rm WHOP_CLIENT_SECRET production
printf 'your_secret' | vercel env add WHOP_CLIENT_SECRET production

# Verify redirect URI matches Whop dashboard exactly
# Ensure using whopApi.oauth.exchangeCode(), not fetch()

vercel --prod
```

---

### Error: CORS "Redirect is not allowed for a preflight request"

**Cause:** Using `<Link>` instead of `<a>` tag

**Fix:**
```tsx
// ❌ Wrong
<Link href="/api/whop/auth/login">Login</Link>

// ✅ Correct
<a href="/api/whop/auth/login">Login</a>
```

---

### Error: TypeScript build failures

**Quick Fix (MVP only):**
```javascript
// next.config.mjs
typescript: { ignoreBuildErrors: true }
```

**Proper Fix (after OAuth works):**
- Fix function signatures
- Add missing props
- Remove `ignoreBuildErrors`

---

## 📝 Essential Commands

### Vercel Environment Variables
```bash
# Add (use printf!)
printf 'value' | vercel env add VAR_NAME production

# Remove
echo "y" | vercel env rm VAR_NAME production

# List
vercel env ls production

# Pull to local
vercel env pull .env.production.local
```

### Deployment
```bash
# Deploy to production
vercel --prod

# Check status
vercel ls

# View logs
vercel logs [deployment-url]
```

### Testing
```bash
# Local dev
PORT=3008 npm run dev

# Build test
npm run build

# Type check
npm run type-check
```

---

## 🎓 Key Learnings

### What Was in Docs (We Missed)
- ✅ Complete OAuth implementation (lines 835-1016)
- ✅ SDK methods: `oauth.getAuthorizationUrl()` and `oauth.exchangeCode()`
- ✅ Environment variables list
- ✅ Login button pattern (`<a>` tags)

### What Was NOT in Docs
- ❌ Vercel CLI env var formatting (`printf` vs `echo`)
- ❌ Next.js `<Link>` CORS gotcha
- ❌ Deployment scope strategy
- ❌ TypeScript configuration

---

## ⏱️ Time Estimates

| Phase | Estimated Time |
|-------|----------------|
| Pre-Development (reading docs, setup) | 30 min |
| Development (coding routes) | 60 min |
| Pre-Deployment (env vars, config) | 15 min |
| Deployment | 10 min |
| **Total** | **~115 min** |

**Compare to:** 3+ hours debugging without this guide

---

## 🎯 Success Criteria

✅ Click "Login with Whop" → Redirect to Whop
✅ Click "Approve" → Redirect to `/dashboard`
✅ Access token stored in cookies
✅ No `%0A` in OAuth URLs
✅ No CORS errors
✅ No TypeScript build failures (or ignored for MVP)

---

## 🔗 References

- **Whop OAuth Guide:** `docs/app_Whop/whop_add_app_commands.md` lines 835-1016
- **Full Documentation:** `WHOP_DEPLOYMENT_BEST_PRACTICES.md`
- **Hurdle Analysis:** `WHOP_INTEGRATION_HURDLES.md`
- **Whop Developer Dashboard:** https://whop.com/dashboard/developer/

---

**Last Updated:** October 24, 2025
**Based On:** Real 3-hour deployment debugging session
**Status:** Battle-tested ✅
