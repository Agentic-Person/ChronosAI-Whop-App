# Production Deployment Guide

**Video Wizard - AI Video Learning Assistant**

Last Updated: 2025-10-27

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Vercel Configuration](#vercel-configuration)
4. [Database Setup](#database-setup)
5. [Deployment Process](#deployment-process)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring Setup](#monitoring-setup)
8. [Rollback Procedures](#rollback-procedures)
9. [Troubleshooting](#troubleshooting)
10. [Day 1 Operations](#day-1-operations)

---

## Pre-Deployment Checklist

Before deploying to production, ensure all items are completed:

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] All ESLint warnings addressed
- [ ] Unit tests passing (`npm test`)
- [ ] Integration tests passing (`npm run test:integration`)
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] Code reviewed and approved
- [ ] No console.logs in production code

### Security
- [ ] All API keys rotated for production
- [ ] Environment variables validated
- [ ] No secrets in codebase
- [ ] CORS origins configured correctly
- [ ] Rate limiting configured
- [ ] SQL injection prevention verified
- [ ] Webhook signature verification tested

### Infrastructure
- [ ] Supabase project created (production)
- [ ] Database migrations tested
- [ ] RLS policies configured
- [ ] Storage buckets created
- [ ] pgvector extension enabled
- [ ] Connection pooling configured

### Third-Party Services
- [ ] Whop app approved and published
- [ ] Anthropic API key (production tier)
- [ ] OpenAI API key (production tier)
- [ ] Sentry project created
- [ ] PostHog project created
- [ ] Vercel KV (Redis) provisioned
- [ ] Inngest account configured
- [ ] Resend domain verified
- [ ] Custom domain DNS configured

### Documentation
- [ ] API documentation updated
- [ ] Environment variables documented
- [ ] Deployment procedures documented
- [ ] Incident response plan ready
- [ ] Runbook created

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/video-wizard.git
cd video-wizard
```

### 2. Install Dependencies

```bash
npm ci
```

### 3. Configure Environment Variables

Copy the production environment template:

```bash
cp .env.production.example .env.production
```

Fill in all required values. See [Environment Variables Guide](./ENVIRONMENT_VARIABLES.md) for details.

### 4. Validate Environment

```bash
node scripts/validate-env.js
```

This will check:
- All required variables are set
- No placeholder values remain
- Format validation passes
- API keys are valid

---

## Vercel Configuration

### 1. Create Vercel Project

```bash
# Install Vercel CLI
npm install -g vercel@latest

# Login to Vercel
vercel login

# Link project
vercel link
```

### 2. Configure Environment Variables

#### Via Vercel CLI:

```bash
# Required variables
vercel env add WHOP_API_KEY production
vercel env add WHOP_CLIENT_SECRET production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add ANTHROPIC_API_KEY production
vercel env add OPENAI_API_KEY production
# ... add all other secrets
```

#### Via Vercel Dashboard:

1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.production.example`
3. Set appropriate scopes (Production, Preview, Development)
4. Use Sensitive flag for secrets

### 3. Configure Vercel Secrets

Store these in Vercel project settings:

- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your project ID
- `VERCEL_TOKEN` - Deployment token (for CI/CD)

### 4. Configure GitHub Integration

1. Connect GitHub repository in Vercel dashboard
2. Enable automatic deployments for `main` branch
3. Configure preview deployments for pull requests
4. Set up deployment protection rules

---

## Database Setup

### 1. Create Supabase Production Project

```bash
# Via Supabase CLI
supabase link --project-ref your-production-project

# Or create new project
supabase projects create video-wizard-production
```

### 2. Run Database Migrations

```bash
# Review pending migrations
ls -la supabase/migrations/

# Apply migrations
supabase db push

# Verify
supabase db diff
```

### 3. Enable pgvector Extension

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 4. Create Storage Buckets

```sql
-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('videos', 'videos', false),
  ('thumbnails', 'thumbnails', true),
  ('user-uploads', 'user-uploads', false);

-- Set up RLS policies (see docs/database/STORAGE_POLICIES.md)
```

### 5. Configure Connection Pooling

In Supabase Dashboard:
1. Go to Settings → Database
2. Enable Connection Pooler
3. Use Transaction mode
4. Set pool size: 20 connections
5. Update `DATABASE_POOLER_URL` in Vercel env vars

### 6. Seed Initial Data (Optional)

```bash
# For demo accounts or initial configuration
node scripts/seed-production.js
```

---

## Deployment Process

### Option 1: Automated Deployment (GitHub Actions)

**Recommended for production**

1. Push to `main` branch:
   ```bash
   git push origin main
   ```

2. GitHub Actions will automatically:
   - Run tests
   - Validate environment
   - Build application
   - Deploy to Vercel
   - Verify deployment
   - Create Sentry release

3. Monitor deployment:
   - GitHub Actions tab
   - Vercel dashboard
   - Sentry deployment tracking

### Option 2: Manual Deployment (CLI)

**Use for emergency deployments or testing**

```bash
# Run deployment script
./scripts/deploy.sh

# Options:
./scripts/deploy.sh --skip-tests  # Skip tests (emergency only)
./scripts/deploy.sh --force       # Skip confirmations
./scripts/deploy.sh --dry-run     # Test without deploying
```

### Option 3: Direct Vercel Deployment

**Use only in emergencies**

```bash
# Pull environment
vercel pull --yes --environment=production

# Build
vercel build --prod

# Deploy
vercel deploy --prebuilt --prod
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
# Check health endpoint
curl https://your-app.vercel.app/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-10-27T12:00:00.000Z",
  "checks": {
    "database": { "status": "ok", "latency": 45 },
    "cache": { "status": "ok", "latency": 12 }
  }
}
```

### 2. Critical Path Testing

Test these user flows immediately after deployment:

#### Student Flow:
1. [ ] Login via Whop OAuth
2. [ ] View dashboard
3. [ ] Play video
4. [ ] Send chat message
5. [ ] Take quiz
6. [ ] View calendar

#### Creator Flow:
1. [ ] Login via Whop OAuth
2. [ ] Upload video
3. [ ] View processing status
4. [ ] Check analytics
5. [ ] View student list

### 3. Performance Verification

```bash
# Lighthouse audit
npm install -g lighthouse

lighthouse https://your-app.vercel.app \
  --only-categories=performance,accessibility,seo \
  --output=html \
  --output-path=./lighthouse-report.html
```

**Targets:**
- Performance: > 90
- Accessibility: > 95
- SEO: > 95

### 4. Database Connectivity

```bash
# Test database connection
node scripts/test-db-connection.js
```

### 5. AI Service Connectivity

```bash
# Test AI integrations
node scripts/test-ai-services.js
```

---

## Monitoring Setup

### 1. Sentry Error Tracking

**Setup:**
```bash
# Sentry is auto-configured via @sentry/nextjs
# Verify in Sentry dashboard that errors are being captured
```

**Configure Alerts:**
1. Go to Sentry → Alerts
2. Create alert rules:
   - Error rate > 1% for 5 minutes
   - New error introduced
   - Error volume spike

### 2. Vercel Analytics

**Enable in Vercel Dashboard:**
1. Project Settings → Analytics
2. Enable Web Analytics
3. Enable Speed Insights

**Monitor:**
- Real User Monitoring (RUM)
- Core Web Vitals
- Page performance

### 3. PostHog Product Analytics

**Setup:**
```javascript
// Already configured in app/providers.tsx
// Verify events in PostHog dashboard
```

**Key Metrics to Track:**
- Daily Active Users (DAU)
- Video completion rate
- Chat message volume
- Quiz completion rate
- Creator upload frequency

### 4. Uptime Monitoring

**Recommended Tools:**
- BetterStack (formerly Better Uptime)
- Pingdom
- UptimeRobot

**Configure:**
- Monitor `/health` endpoint
- Check interval: 1 minute
- Alert channels: Email, Slack, Discord

### 5. Custom Metrics Dashboard

Create dashboard in PostHog/Grafana:
- API response times
- Database query performance
- AI API latency
- Cache hit rate
- Video processing queue depth

---

## Rollback Procedures

### Emergency Rollback

**Using Rollback Script:**
```bash
# Rollback to previous deployment
./scripts/rollback.sh

# Rollback to specific deployment
./scripts/rollback.sh https://app-abc123.vercel.app
```

**Manual Rollback via Vercel Dashboard:**
1. Go to Deployments tab
2. Find previous successful deployment
3. Click "..." menu → "Promote to Production"
4. Confirm promotion

**Manual Rollback via CLI:**
```bash
# List recent deployments
vercel ls --prod

# Promote specific deployment
vercel promote [deployment-url]
```

### Post-Rollback Actions

1. **Verify Health:**
   ```bash
   curl https://your-app.vercel.app/health
   ```

2. **Check Error Rates:**
   - Monitor Sentry for 15 minutes
   - Check error volume decreased

3. **Document Incident:**
   - Record in incident log
   - Update team in Slack/Discord
   - Plan fix deployment

4. **Investigate Root Cause:**
   - Review deployment diff
   - Check error logs
   - Identify breaking change

---

## Troubleshooting

### Deployment Fails to Build

**Symptoms:**
- Build fails in Vercel/GitHub Actions
- TypeScript errors
- Missing dependencies

**Solutions:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm ci

# Check TypeScript
npx tsc --noEmit

# Check for missing env vars
node scripts/validate-env.js
```

### Database Connection Errors

**Symptoms:**
- Health check shows database error
- "Connection timeout" errors

**Solutions:**
1. Check Supabase project status
2. Verify connection pooler enabled
3. Check environment variables:
   ```bash
   echo $DATABASE_POOLER_URL
   ```
4. Test connection:
   ```bash
   psql $DATABASE_POOLER_URL
   ```

### High Memory Usage / Timeouts

**Symptoms:**
- 502 errors
- Function timeout errors
- Out of memory errors

**Solutions:**
1. Check function memory in `vercel.json`
2. Increase timeout for heavy endpoints
3. Optimize AI API calls
4. Implement caching

### AI API Rate Limits

**Symptoms:**
- "Rate limit exceeded" errors
- Slow chat responses

**Solutions:**
1. Check API tier limits
2. Implement request queuing
3. Add caching layer
4. Upgrade API tier

### Vector Search Performance

**Symptoms:**
- Slow search results
- Database timeout errors

**Solutions:**
1. Check pgvector indexes:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'video_chunks';
   ```
2. Optimize chunk size
3. Reduce search dimensions
4. Add query caching

---

## Day 1 Operations

### First 24 Hours After Launch

#### Hour 1: Monitor Closely
- [ ] Watch error rates in Sentry (target: < 0.1%)
- [ ] Monitor API response times (target: < 2s p95)
- [ ] Check database performance
- [ ] Verify health endpoint every 5 minutes

#### Hour 2-4: User Testing
- [ ] Test critical flows as real user
- [ ] Monitor user signups
- [ ] Check first chat interactions
- [ ] Verify video uploads working

#### Hour 4-8: Performance Tuning
- [ ] Review slow API endpoints
- [ ] Optimize database queries
- [ ] Check cache hit rates
- [ ] Monitor AI API usage

#### Hour 8-24: Scale Monitoring
- [ ] Watch for traffic patterns
- [ ] Monitor Vercel function invocations
- [ ] Check database connection pool
- [ ] Review error trends

### First Week Operations

**Daily Tasks:**
- [ ] Review Sentry errors (morning/evening)
- [ ] Check key metrics dashboard
- [ ] Monitor user feedback
- [ ] Review API costs

**Weekly Tasks:**
- [ ] Review analytics trends
- [ ] Performance optimization
- [ ] Database cleanup/optimization
- [ ] Update documentation

### Key Metrics to Monitor

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Error Rate | < 0.1% | > 1% |
| API Response Time (p95) | < 2s | > 5s |
| Database Latency | < 100ms | > 500ms |
| AI API Latency | < 3s | > 10s |
| Uptime | > 99.9% | < 99% |
| Video Processing Time | < 5min/hour | > 10min/hour |

### Incident Response

**Severity Levels:**

**P0 (Critical):**
- Complete service outage
- Data loss or corruption
- Security breach

**Response:** Immediate rollback, all hands on deck

**P1 (High):**
- Major feature broken
- High error rate (> 5%)
- Significant performance degradation

**Response:** Rollback or hotfix within 1 hour

**P2 (Medium):**
- Minor feature broken
- Elevated error rate (1-5%)
- Moderate performance issues

**Response:** Fix in next deployment

**P3 (Low):**
- Cosmetic issues
- Non-critical bugs

**Response:** Plan fix in backlog

---

## Additional Resources

- [Environment Variables Reference](./ENVIRONMENT_VARIABLES.md)
- [Database Schema Documentation](../database/SCHEMA.md)
- [API Documentation](../api/API_REFERENCE.md)
- [Monitoring Setup Guide](./MONITORING.md)
- [Security Best Practices](./SECURITY.md)
- [Performance Optimization](./PERFORMANCE.md)

---

## Support Contacts

**Technical Issues:**
- Email: devops@yourcompany.com
- Slack: #tech-ops

**Vercel Support:**
- Dashboard: https://vercel.com/support
- Email: support@vercel.com

**Supabase Support:**
- Dashboard: https://supabase.com/dashboard/support
- Discord: https://discord.supabase.com

**Emergency On-Call:**
- PagerDuty: [Your PagerDuty link]
- Phone: [On-call number]

---

**Document Version:** 1.0
**Last Reviewed:** 2025-10-27
**Next Review:** 2025-11-27
