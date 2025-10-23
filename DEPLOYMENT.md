# Deployment Guide - ChronosAI Platform

This guide covers deploying the ChronosAI Platform to Vercel.

## Prerequisites

- ✅ Working OAuth implementation (tested locally)
- ✅ Whop Developer Account with app configured
- ✅ Vercel account (sign up at https://vercel.com)
- ✅ Git repository pushed to GitHub

## Quick Start

### Option 1: Automated Deployment (Recommended)

Run the deployment script:

```bash
bash vercel-deploy.sh
```

Follow the interactive prompts to:
1. Deploy to preview or production
2. Configure environment variables
3. Get post-deployment instructions

### Option 2: Manual Deployment

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

#### Step 3: Deploy

**For preview deployment:**
```bash
vercel
```

**For production deployment:**
```bash
vercel --prod
```

## Environment Variables

### Required for OAuth (Must Configure First)

Add these in Vercel Dashboard (Settings → Environment Variables):

| Variable | Description | Example |
|----------|-------------|---------|
| `WHOP_API_KEY` | Your Whop API key | `whop_...` |
| `NEXT_PUBLIC_WHOP_APP_ID` | Your Whop App ID | `app_...` |
| `WHOP_CLIENT_ID` | OAuth Client ID | `oauth_client_...` |
| `WHOP_CLIENT_SECRET` | OAuth Client Secret | `oauth_secret_...` |
| `WHOP_TOKEN_ENCRYPTION_KEY` | 64-char hex key | Generate with `openssl rand -hex 32` |
| `WHOP_OAUTH_REDIRECT_URI` | Production callback URL | `https://your-app.vercel.app/api/whop/auth/callback` |
| `NEXT_PUBLIC_APP_URL` | Your production URL | `https://your-app.vercel.app` |

### Optional (Can Add Later)

These are not needed for initial OAuth deployment:

- Supabase variables (for chat functionality)
- AI API keys (for video processing)
- Storage/S3 (for video uploads)
- Monitoring tools (Sentry, PostHog)

## Post-Deployment Configuration

### 1. Update Whop OAuth Redirect URI

1. Go to https://dev.whop.com
2. Navigate to your app → Settings → OAuth
3. Add your production redirect URI:
   ```
   https://your-production-url.vercel.app/api/whop/auth/callback
   ```
4. Save changes

### 2. Test OAuth Flow

1. Visit your production URL
2. Click "Login with Whop"
3. Authorize the app
4. Verify:
   - ✅ Successful redirect to dashboard
   - ✅ No console errors
   - ✅ Access token stored in cookie

### 3. Monitor Deployment

Visit Vercel Dashboard:
- Check deployment logs
- Monitor runtime logs
- Review function execution

## Troubleshooting

### OAuth Redirect Error

**Problem:** "Invalid redirect_uri" error

**Solution:**
1. Check `WHOP_OAUTH_REDIRECT_URI` matches exactly in both:
   - Vercel environment variables
   - Whop Developer Dashboard
2. Ensure no trailing slashes
3. Use exact URL: `https://your-app.vercel.app/api/whop/auth/callback`

### Environment Variable Not Found

**Problem:** Environment variable undefined in production

**Solution:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Verify variable is set for "Production" environment
3. Redeploy: `vercel --prod`

### Build Failures

**Problem:** Build fails on Vercel

**Solution:**
1. Check build logs in Vercel Dashboard
2. Verify all dependencies in `package.json`
3. Check for TypeScript errors locally: `npm run build`
4. Review `.vercelignore` to ensure needed files aren't excluded

## Domain Configuration

### Using Vercel Subdomain

Default: `https://your-project-name.vercel.app`

No additional configuration needed.

### Using Custom Domain

1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update:
   - `NEXT_PUBLIC_APP_URL` environment variable
   - Whop OAuth redirect URI

## Deployment Workflow

### Development → Preview → Production

```bash
# 1. Make changes locally
git checkout -b feature/new-feature

# 2. Test locally
npm run dev

# 3. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 4. Deploy to preview
vercel

# 5. Test preview deployment
# Visit preview URL shown in terminal

# 6. Merge to main and deploy to production
git checkout whop-mvp-phase1
git merge feature/new-feature
git push origin whop-mvp-phase1
vercel --prod
```

## CI/CD with Vercel

Vercel automatically deploys:
- **Preview deployments** for every push to any branch
- **Production deployments** when pushing to main/master branch

Configure in Vercel Dashboard → Settings → Git.

## Monitoring Production

### View Logs

```bash
vercel logs <deployment-url>
```

### View Runtime Logs

Vercel Dashboard → Deployments → Select deployment → Function Logs

### Monitor Performance

Vercel Dashboard → Analytics → View metrics:
- Response times
- Error rates
- Bandwidth usage

## Security Checklist

Before going live:

- [ ] All secrets in environment variables (not in code)
- [ ] `WHOP_TOKEN_ENCRYPTION_KEY` is strong (64 hex chars)
- [ ] OAuth redirect URIs whitelist production domain only
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] Rate limiting configured (if needed)
- [ ] CORS policies set correctly

## Rollback

If deployment has issues:

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "Promote to Production"

Or via CLI:
```bash
vercel rollback
```

## Support

- Vercel Docs: https://vercel.com/docs
- Whop Developer Docs: https://docs.whop.com
- GitHub Issues: https://github.com/Agentic-Person/ChronosAI-Platform/issues

## Current Deployment Status

**Branch:** `whop-mvp-phase1`
**Last Commit:** OAuth implementation with WhopServerSdk
**Features Working:**
- ✅ Landing page
- ✅ Whop OAuth login
- ✅ Dashboard loading
- ⚠️ Chat (requires Supabase configuration)

**Next Steps:**
1. Deploy to Vercel
2. Configure OAuth environment variables
3. Test production OAuth flow
4. Configure Supabase for chat functionality
