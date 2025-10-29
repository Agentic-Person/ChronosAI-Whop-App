# Staging Deployment Guide

**Version:** 1.0.0
**Last Updated:** October 28, 2025
**Platform:** Vercel
**Framework:** Next.js 14 (App Router)

This guide walks you through deploying the AI Video Learning Assistant to a Vercel staging environment for pre-production testing.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Vercel Project Setup](#vercel-project-setup)
3. [Environment Variables Configuration](#environment-variables-configuration)
4. [Git Branch Strategy](#git-branch-strategy)
5. [Deployment Methods](#deployment-methods)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Accessing Staging URLs](#accessing-staging-urls)
8. [Rollback Strategy](#rollback-strategy)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying to staging, ensure you have:

### 1. Required Accounts
- [ ] GitHub account with repository access
- [ ] Vercel account (free tier sufficient for staging)
- [ ] Whop Developer account with app credentials
- [ ] Supabase account with project created
- [ ] Anthropic API account with API key
- [ ] OpenAI API account with API key

### 2. Local Development Setup
- [ ] Node.js 18+ installed (`node -v`)
- [ ] npm or pnpm package manager
- [ ] Git installed and configured
- [ ] Vercel CLI installed (optional but recommended)

### 3. Environment Variables Ready
- [ ] All Tier 1 variables from `PRODUCTION_ENV_CHECKLIST.md` (15 variables)
- [ ] Generated encryption key from `scripts/generate-encryption-key.js`
- [ ] All secrets stored securely (not in git)

### 4. Code Quality Checks
```bash
# Run these locally before deploying
npm run lint          # Check code style
npm run test          # Run unit tests
npm run build         # Verify build succeeds
```

---

## Vercel Project Setup

### Step 1: Install Vercel CLI (Optional)

```bash
# Install globally
npm install -g vercel

# Login to Vercel
vercel login

# Link to existing project or create new one
cd /path/to/AI-Video-Learning-Assistant
vercel link
```

**Alternative:** Use Vercel Dashboard (web UI) for all setup without CLI.

---

### Step 2: Create Vercel Project (Dashboard Method)

1. **Navigate to Vercel Dashboard:**
   - Go to https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import Git Repository:**
   - Select "Import Git Repository"
   - Choose your GitHub repository: `AI-Video-Learning-Assistant`
   - Click "Import"

3. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `.` (leave default)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm ci` (auto-detected)

4. **Environment Variables:**
   - **DO NOT** add variables yet (we'll do this in the next section)
   - Click "Deploy" to create the project (will fail initially - expected)

5. **Project Created:**
   - Note your project name (e.g., `mentora` or `ai-video-learning-assistant`)
   - Note your production domain (e.g., `mentora.vercel.app`)

---

### Step 3: Create Staging Environment

By default, Vercel has three environments:
- **Production:** Deployments from `main` branch
- **Preview:** Deployments from other branches (this is your staging)
- **Development:** Local development

**Staging Strategy:**
- Use a dedicated `staging` branch for staging deployments
- All pushes to `staging` branch will deploy to preview environment
- Preview URLs are stable and can be used for testing

---

## Environment Variables Configuration

### Step 1: Access Environment Variables

**Via Vercel Dashboard:**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Navigate to **Settings** → **Environment Variables**

**Via Vercel CLI:**
```bash
# List all environment variables
vercel env ls

# Add a new environment variable
vercel env add VARIABLE_NAME preview
```

---

### Step 2: Add All Required Variables

Use the `PRODUCTION_ENV_CHECKLIST.md` as your reference. For staging, add variables to the **Preview** environment.

**Quickstart - Add Tier 1 Variables (Critical):**

| Variable | Value Source | Environment |
|----------|--------------|-------------|
| `WHOP_API_KEY` | Whop Developer Dashboard | Preview |
| `NEXT_PUBLIC_WHOP_APP_ID` | Whop Developer Dashboard | Preview, Production, Development |
| `WHOP_CLIENT_ID` | Whop Developer Dashboard | Preview |
| `WHOP_CLIENT_SECRET` | Whop Developer Dashboard | Preview |
| `WHOP_WEBHOOK_SECRET` | Whop Developer Dashboard | Preview |
| `WHOP_TOKEN_ENCRYPTION_KEY` | Run `node scripts/generate-encryption-key.js` | Preview |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard | Preview, Production, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard | Preview, Production, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard | Preview |
| `ANTHROPIC_API_KEY` | Anthropic Console | Preview |
| `OPENAI_API_KEY` | OpenAI Platform | Preview |
| `NEXT_PUBLIC_APP_URL` | Your staging URL (TBD - see below) | Preview |
| `NODE_ENV` | `production` | Preview, Production |
| `LOG_LEVEL` | `debug` | Preview |

**Important Notes:**
1. **DO NOT** add `NEXT_PUBLIC_APP_URL` yet - we'll get this after first deployment
2. For staging, use the same Supabase project or create a separate staging database
3. Use separate API keys for staging if possible (prevent production quota exhaustion)

---

### Step 3: Batch Add Variables (Recommended)

**Create a file locally:** `staging.env` (DO NOT commit to git!)

```bash
# Staging Environment Variables
WHOP_API_KEY=your_whop_api_key
NEXT_PUBLIC_WHOP_APP_ID=your_whop_app_id
WHOP_CLIENT_ID=your_whop_client_id
WHOP_CLIENT_SECRET=your_whop_client_secret
WHOP_WEBHOOK_SECRET=your_whop_webhook_secret
WHOP_TOKEN_ENCRYPTION_KEY=1b4338ea0cc00def7b88bd03cc9d4e8ab0e7f096e8f104cc9f8d0ddc7ef40485
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
NODE_ENV=production
LOG_LEVEL=debug
```

**Using Vercel CLI to add all at once:**
```bash
# Add each variable for Preview environment
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ ]] && continue  # Skip comments
  [[ -z "$key" ]] && continue         # Skip empty lines
  echo "Adding $key..."
  vercel env add "$key" preview <<< "$value"
done < staging.env

# Clean up (delete the file after adding)
rm staging.env
```

**Using Vercel Dashboard (Manual):**
1. Go to Settings → Environment Variables
2. Click "Add Variable"
3. For each variable:
   - **Key:** Variable name (e.g., `WHOP_API_KEY`)
   - **Value:** Variable value (paste the actual value)
   - **Environments:** Check **Preview** only (for staging)
4. Click "Save"
5. Repeat for all 15 Tier 1 variables

---

### Step 4: Update Whop OAuth Configuration

After your first deployment (next section), you'll get a staging URL like:
```
https://ai-video-learning-assistant-git-staging-yourteam.vercel.app
```

**Update Whop Developer Dashboard:**
1. Go to https://dev.whop.com
2. Navigate to your app → **OAuth** settings
3. Add new redirect URI:
   ```
   https://your-staging-url.vercel.app/api/whop/auth/callback
   ```
4. Add new webhook URL:
   ```
   https://your-staging-url.vercel.app/api/webhooks/whop
   ```
5. Save changes

**Update Vercel Environment Variables:**
1. Add `NEXT_PUBLIC_APP_URL` variable:
   - Key: `NEXT_PUBLIC_APP_URL`
   - Value: `https://your-staging-url.vercel.app` (NO trailing slash)
   - Environment: Preview
2. Redeploy (push to `staging` branch or trigger manual redeploy)

---

## Git Branch Strategy

### Recommended Branch Structure

```
main (production)
  ├── staging (pre-production testing)
  └── feature/* (development branches)
```

**Workflow:**
1. Create feature branches from `main`
2. Merge feature branches to `staging` for testing
3. After testing, merge `staging` to `main` for production

---

### Step 1: Create Staging Branch

```bash
# Ensure you're on main and up-to-date
git checkout main
git pull origin main

# Create staging branch from main
git checkout -b staging

# Push staging branch to remote
git push -u origin staging
```

---

### Step 2: Configure Branch Protection (Optional)

**Via GitHub:**
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Add branch protection rule for `staging`:
   - Require pull request reviews
   - Require status checks to pass (CI/CD)
   - Prevent force pushes

---

## Deployment Methods

### Method 1: Automated Deployment Script (Recommended)

Use the provided `scripts/deploy-staging.sh` script for automated deployment.

**Usage:**
```bash
# Make script executable (first time only)
chmod +x scripts/deploy-staging.sh

# Deploy to staging
./scripts/deploy-staging.sh

# Options
./scripts/deploy-staging.sh --skip-tests    # Skip tests (faster)
./scripts/deploy-staging.sh --dry-run       # Test without deploying
```

**What it does:**
1. Validates environment variables
2. Runs linter and tests
3. Builds the application
4. Deploys to Vercel preview environment
5. Runs health checks
6. Outputs staging URL

---

### Method 2: Vercel CLI Manual Deployment

```bash
# Navigate to project directory
cd /path/to/AI-Video-Learning-Assistant

# Pull environment variables from Vercel
vercel env pull .env.vercel.preview

# Deploy to preview environment
vercel --env=preview

# Or deploy to a specific branch
vercel --env=preview --branch=staging

# Wait for deployment URL
# Example output: https://mentora-git-staging.vercel.app
```

---

### Method 3: Git Push (Automatic via Vercel Integration)

**Setup (one-time):**
1. Ensure Vercel is connected to your GitHub repository
2. Verify Vercel has "Git Integration" enabled (Settings → Git)

**Deploy:**
```bash
# Commit your changes
git add .
git commit -m "feat(staging): prepare for staging deployment"

# Push to staging branch
git push origin staging

# Vercel will automatically:
# 1. Detect the push
# 2. Build the application
# 3. Deploy to preview environment
# 4. Comment on GitHub commit with URL
```

**Monitor Deployment:**
- Check Vercel Dashboard → Deployments
- View logs in real-time
- Get deployment URL from GitHub commit comment

---

### Method 4: Vercel Dashboard Manual Trigger

1. Go to Vercel Dashboard → Your Project
2. Click "Deployments" tab
3. Find the latest deployment from `staging` branch
4. Click "..." → "Redeploy"
5. Select "Redeploy with existing Build Cache" or "Redeploy without Cache"
6. Click "Redeploy"

---

## Post-Deployment Verification

### Step 1: Wait for Deployment to Complete

```bash
# If using Vercel CLI
vercel --env=preview
# Wait for output: ✓ Production: https://your-url.vercel.app [copied to clipboard]

# Note the URL
export STAGING_URL="https://your-staging-url.vercel.app"
```

---

### Step 2: Run Health Check

```bash
# Using the test-health script
chmod +x scripts/test-health.sh
./scripts/test-health.sh $STAGING_URL

# Or manually with curl
curl -f $STAGING_URL/api/health

# Expected output:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-28T12:00:00.000Z",
#   "checks": {
#     "database": { "status": "ok", "latency": 45 },
#     "cache": { "status": "ok", "latency": 12 }
#   }
# }
```

**Health Status Codes:**
- `200` - Healthy (all checks passed)
- `200` with `"status": "degraded"` - Partially healthy (some checks failed)
- `503` - Unhealthy (critical checks failed)

---

### Step 3: Test Critical Endpoints

```bash
# Test homepage
curl -I $STAGING_URL
# Expected: HTTP/2 200

# Test API routes (requires authentication)
# These will return 401 without auth - that's expected
curl -I $STAGING_URL/api/student/chat
# Expected: HTTP/2 401 or HTTP/2 200 with auth header

# Test static assets
curl -I $STAGING_URL/_next/static/css/app/layout.css
# Expected: HTTP/2 200
```

---

### Step 4: Manual Testing Checklist

Open your staging URL in a browser and verify:

**Authentication Flow:**
- [ ] Landing page loads (https://your-staging-url.vercel.app)
- [ ] "Login with Whop" button works
- [ ] OAuth redirects to Whop correctly
- [ ] After auth, redirects back to dashboard
- [ ] User session persists (refresh page)

**Dashboard Features:**
- [ ] Creator dashboard accessible
- [ ] Student dashboard accessible
- [ ] Video upload form loads
- [ ] Chat interface renders
- [ ] No console errors in browser DevTools

**Database Connection:**
- [ ] Health check returns `"database": { "status": "ok" }`
- [ ] User profiles load in dashboard
- [ ] Videos list loads (empty or with data)

**AI Features:**
- [ ] Can send chat messages (test with simple query)
- [ ] AI responds with answers (may be slow on cold start)
- [ ] Video transcription jobs can be created

---

### Step 5: Monitor Logs

**Vercel Dashboard:**
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest staging deployment
3. Navigate to "Functions" tab
4. Click on any API route (e.g., `/api/health`)
5. View real-time logs

**Vercel CLI:**
```bash
# Tail logs for staging deployment
vercel logs --follow --environment=preview

# Filter by specific function
vercel logs /api/health --environment=preview
```

**What to look for:**
- No uncaught exceptions
- No 500 errors
- Database connection successful
- AI API calls succeeding (or graceful failures)

---

## Accessing Staging URLs

### Preview URL Patterns

Vercel generates preview URLs in this format:
```
https://{project}-{branch}-{team}.vercel.app
```

**Examples:**
```
# Staging branch
https://mentora-git-staging-acmecorp.vercel.app

# Feature branch
https://mentora-git-add-quiz-feature-acmecorp.vercel.app

# Pull request preview
https://mentora-pr-123-acmecorp.vercel.app
```

---

### Finding Your Staging URL

**Method 1: Vercel Dashboard**
1. Go to Vercel Dashboard → Your Project
2. Click "Deployments" tab
3. Find deployment from `staging` branch
4. Copy the URL (shows in "Domains" column)

**Method 2: GitHub Integration**
- Push to `staging` branch
- Vercel bot will comment on the commit with the URL
- Example: "✅ Deployed to https://..."

**Method 3: Vercel CLI**
```bash
# Get latest preview deployment URL
vercel ls --environment=preview

# Output format:
# Age  Deployment                                              Status
# 2m   https://mentora-git-staging-acme.vercel.app            Ready
```

**Method 4: Git Commit Messages**
```bash
# Check git log for Vercel deployment comments
git log --oneline --decorate staging
```

---

### Sharing Staging URL

**Internal Testing:**
- Share the staging URL with your team
- Preview URLs are **public** by default (no authentication at CDN level)
- Application-level authentication still required (Whop OAuth)

**Password Protection (Optional):**
1. Go to Vercel Dashboard → Settings → Deployment Protection
2. Enable "Password Protection" for Preview deployments
3. Set a password
4. Share password with testers

---

## Rollback Strategy

### Rolling Back to Previous Deployment

**Via Vercel Dashboard:**
1. Go to Vercel Dashboard → Your Project → Deployments
2. Find a previous successful deployment
3. Click "..." → "Promote to Production" (or "Promote to Staging")
4. Confirm rollback

**Via Vercel CLI:**
```bash
# List recent deployments
vercel ls --environment=preview

# Rollback to specific deployment
vercel rollback <deployment-url>
```

**Via Git:**
```bash
# Revert to a previous commit
git checkout staging
git revert HEAD~1  # Revert last commit
git push origin staging

# Or hard reset (dangerous - only for staging)
git reset --hard <commit-hash>
git push -f origin staging
```

---

## Troubleshooting

### Common Issues

#### 1. Deployment Fails with "Build Error"

**Symptoms:**
- Vercel deployment shows "Build Failed"
- Error logs show TypeScript or build errors

**Solutions:**
```bash
# Test build locally
npm run build

# Check for TypeScript errors
npm run lint

# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

---

#### 2. Environment Variables Not Loading

**Symptoms:**
- Application crashes on startup
- Logs show "Missing environment variable" errors
- Health check fails with 500 error

**Solutions:**
1. Verify all variables are added to **Preview** environment in Vercel
2. Check for typos in variable names
3. Redeploy after adding variables:
   ```bash
   vercel --env=preview --force
   ```
4. Pull latest env vars locally:
   ```bash
   vercel env pull .env.vercel.preview
   ```

---

#### 3. OAuth Redirect Fails

**Symptoms:**
- "Invalid redirect_uri" error from Whop
- After Whop login, redirects to wrong URL
- Authentication loop

**Solutions:**
1. Update `NEXT_PUBLIC_APP_URL` in Vercel to match staging URL (no trailing slash)
2. Update Whop Developer Dashboard with correct redirect URI:
   ```
   https://your-staging-url.vercel.app/api/whop/auth/callback
   ```
3. Verify `WHOP_CLIENT_ID` and `WHOP_CLIENT_SECRET` are correct
4. Redeploy after changes

---

#### 4. Database Connection Fails

**Symptoms:**
- Health check shows `"database": { "status": "error" }`
- API routes return 500 errors
- Logs show "Could not connect to database"

**Solutions:**
1. Verify Supabase credentials:
   ```bash
   curl https://your-project.supabase.co/rest/v1/
   # Should return 200 OK
   ```
2. Check Supabase project is not paused (free tier pauses after inactivity)
3. Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
4. Check Supabase logs for connection errors
5. Ensure pgvector extension is enabled:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

---

#### 5. AI API Calls Fail

**Symptoms:**
- Chat responses fail with "AI service unavailable"
- Video transcription hangs
- Logs show 401 or 429 errors from OpenAI/Anthropic

**Solutions:**
1. Verify API keys are valid:
   ```bash
   # Test Anthropic API
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-5-sonnet-20241022","messages":[{"role":"user","content":"test"}],"max_tokens":10}'

   # Test OpenAI API
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```
2. Check billing is enabled in both dashboards
3. Verify rate limits not exceeded (429 errors)
4. Check for quota/usage limits

---

#### 6. Slow Performance

**Symptoms:**
- Pages take >5 seconds to load
- API responses timeout
- Health check shows high latency

**Solutions:**
1. Check Vercel function logs for cold starts (first request slow)
2. Enable Vercel Edge Functions for faster response times
3. Verify database location (should be close to Vercel region)
4. Check for missing indexes in Supabase
5. Monitor Vercel Analytics for bottlenecks

---

#### 7. Webhook Signature Verification Fails

**Symptoms:**
- Whop webhooks return 401 errors
- Logs show "Invalid webhook signature"
- Membership sync doesn't work

**Solutions:**
1. Verify `WHOP_WEBHOOK_SECRET` matches Whop Dashboard
2. Check webhook endpoint is accessible:
   ```bash
   curl -X POST $STAGING_URL/api/webhooks/whop \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   # Should return 401 (signature missing) - that's expected
   ```
3. Test with actual webhook from Whop Dashboard (trigger test event)
4. Check Whop webhook logs for delivery errors

---

### Debug Mode

Enable detailed logging for troubleshooting:

1. Set `LOG_LEVEL=debug` in Vercel environment variables
2. Redeploy
3. Check logs for detailed output:
   ```bash
   vercel logs --follow --environment=preview
   ```

---

### Getting Help

If issues persist:

1. **Check Vercel Status:** https://www.vercel-status.com
2. **Check Supabase Status:** https://status.supabase.com
3. **Review Documentation:**
   - Vercel: https://vercel.com/docs
   - Next.js: https://nextjs.org/docs
   - Supabase: https://supabase.com/docs
4. **Contact Support:**
   - Vercel: https://vercel.com/support
   - Supabase: https://supabase.com/support

---

## Next Steps After Staging Deployment

Once staging is successfully deployed and tested:

1. **Test Critical Flows:**
   - Complete user registration and authentication
   - Upload and process a test video
   - Send chat messages and verify AI responses
   - Generate and complete a quiz

2. **Load Testing (Optional):**
   ```bash
   npm run load-test:quick
   ```

3. **Performance Monitoring:**
   - Enable Vercel Analytics
   - Set up Sentry for error tracking
   - Configure PostHog for user analytics

4. **Security Audit:**
   - Review environment variables (no secrets exposed)
   - Test rate limiting on API routes
   - Verify authentication on all protected routes
   - Check CORS configuration

5. **Documentation:**
   - Document any configuration changes
   - Update team wiki with staging URL
   - Create runbook for common issues

6. **Production Preparation:**
   - Review `PRODUCTION_ENV_CHECKLIST.md`
   - Set up custom domain for production
   - Configure production-specific monitoring
   - Plan production deployment timeline

---

## Quick Reference Commands

```bash
# Generate encryption key
node scripts/generate-encryption-key.js

# Deploy to staging (automated)
./scripts/deploy-staging.sh

# Deploy to staging (manual)
vercel --env=preview

# Check health endpoint
curl https://your-staging-url.vercel.app/api/health

# View logs
vercel logs --follow --environment=preview

# List deployments
vercel ls --environment=preview

# Rollback to previous deployment
vercel rollback <deployment-url>

# Pull environment variables locally
vercel env pull .env.vercel.preview
```

---

## Support

For questions or issues with this deployment guide:
- Review `PRODUCTION_ENV_CHECKLIST.md` for environment variable details
- Check `scripts/deploy-staging.sh` for automation details
- Consult project maintainers or DevOps team

**Last Updated:** October 28, 2025
**Maintained By:** DevOps Team
