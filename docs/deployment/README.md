# Deployment Documentation

Welcome to the Video Wizard deployment documentation. This directory contains all resources needed for production deployment.

---

## Quick Start

### First-Time Deployment

1. **Review Pre-requisites:**
   - Vercel account created
   - Supabase project created (production)
   - All third-party API keys obtained
   - Domain configured (optional)

2. **Configure Environment:**
   ```bash
   # Copy production template
   cp .env.production.example .env.production

   # Fill in all values (see ENVIRONMENT_VARIABLES.md)
   nano .env.production

   # Validate
   npm run validate:env
   ```

3. **Deploy:**
   ```bash
   # Automated via GitHub Actions
   git push origin main

   # OR manual deployment
   ./scripts/deploy.sh
   ```

4. **Verify:**
   ```bash
   # Check health
   curl https://your-app.vercel.app/health

   # Test critical flows (see CHECKLIST.md)
   ```

---

## Documentation Files

### [DEPLOYMENT.md](./DEPLOYMENT.md)
**Complete deployment guide** covering:
- Pre-deployment checklist
- Environment setup
- Vercel configuration
- Database setup
- Deployment process
- Post-deployment verification
- Monitoring setup
- Rollback procedures
- Troubleshooting
- Day 1 operations

**When to use:**
- First-time deployment
- Understanding deployment process
- Troubleshooting deployment issues
- Setting up monitoring

### [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
**Complete environment variables reference** including:
- All variable descriptions
- Required vs optional
- Format validation
- Security best practices
- Where to get API keys
- Troubleshooting

**When to use:**
- Setting up environment
- Understanding what each variable does
- Getting API keys
- Troubleshooting configuration issues

### [CHECKLIST.md](./CHECKLIST.md)
**Step-by-step deployment checklist** covering:
- Pre-deployment tasks
- Deployment day procedures
- Post-deployment verification
- First 24 hours monitoring
- Week 1 operations
- Rollback triggers

**When to use:**
- Before every deployment
- During deployment execution
- Post-deployment monitoring
- Ensuring nothing is missed

---

## Deployment Methods

### Method 1: GitHub Actions (Recommended)

**Best for:** Production deployments, team workflows

**How it works:**
1. Push to `main` branch
2. GitHub Actions automatically:
   - Validates environment
   - Runs tests
   - Builds application
   - Deploys to Vercel
   - Verifies deployment
   - Creates Sentry release

**Setup:**
- Workflows in `.github/workflows/`
- Configure secrets in GitHub repository settings
- See workflow files for required secrets

**Usage:**
```bash
git push origin main
```

Monitor at: https://github.com/your-org/video-wizard/actions

### Method 2: Deployment Script (Semi-Automated)

**Best for:** Manual deployments, emergency fixes

**How it works:**
1. Run deployment script
2. Script performs:
   - Pre-flight checks
   - Environment validation
   - Test execution
   - Build verification
   - Vercel deployment
   - Post-deployment verification

**Usage:**
```bash
# Standard deployment
./scripts/deploy.sh

# Skip tests (emergency only)
./scripts/deploy.sh --skip-tests

# Dry run (test without deploying)
./scripts/deploy.sh --dry-run

# Force (skip confirmations)
./scripts/deploy.sh --force
```

### Method 3: Direct Vercel CLI

**Best for:** Emergency deployments, debugging

**How it works:**
Direct deployment via Vercel CLI without automation

**Usage:**
```bash
# Install Vercel CLI
npm install -g vercel@latest

# Login
vercel login

# Deploy
vercel --prod
```

---

## Rollback Procedures

### Quick Rollback

```bash
# Rollback to previous deployment
./scripts/rollback.sh

# Rollback to specific deployment
./scripts/rollback.sh https://app-abc123.vercel.app
```

### Manual Rollback

**Via Vercel Dashboard:**
1. Go to Deployments tab
2. Find previous successful deployment
3. Click "..." → "Promote to Production"

**Via CLI:**
```bash
# List deployments
vercel ls --prod

# Promote specific deployment
vercel promote [deployment-url]
```

---

## Monitoring & Health Checks

### Health Endpoint

```bash
# Basic health check
curl https://your-app.vercel.app/health

# Detailed health check
curl https://your-app.vercel.app/health?system=true

# Specific checks
curl https://your-app.vercel.app/health?check=database
curl https://your-app.vercel.app/health?check=cache
```

### Monitoring Dashboards

- **Vercel:** https://vercel.com/dashboard
- **Sentry:** https://sentry.io
- **PostHog:** https://app.posthog.com
- **Supabase:** https://app.supabase.com

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Error Rate | < 0.1% | > 1% |
| API Response Time (p95) | < 2s | > 5s |
| Database Latency | < 100ms | > 500ms |
| Uptime | > 99.9% | < 99% |

---

## Configuration Files

### [`vercel.json`](../../vercel.json)
Main Vercel configuration including:
- Function timeouts and memory
- Security headers
- Caching rules
- Redirects and rewrites

### [`.env.production.example`](../../.env.production.example)
Production environment template with all variables documented

### [`.github/workflows/`](../../.github/workflows/)
GitHub Actions CI/CD workflows:
- `deploy-production.yml` - Production deployment
- `deploy-preview.yml` - PR preview deployments

### [`scripts/`](../../scripts/)
Deployment automation scripts:
- `deploy.sh` - Deployment script
- `rollback.sh` - Rollback script
- `validate-env.js` - Environment validation

---

## Common Operations

### Validate Environment
```bash
npm run validate:env
```

### Deploy to Production
```bash
# Via GitHub (recommended)
git push origin main

# Via script
./scripts/deploy.sh
```

### Check Health
```bash
# Local
npm run health

# Production
npm run health:prod
```

### View Logs
```bash
# Vercel logs
vercel logs [deployment-url]

# Real-time logs
vercel logs --follow
```

### Database Operations
```bash
# Apply migrations
npm run db:migrate

# Connect to database
psql $DATABASE_POOLER_URL
```

---

## Troubleshooting

### Deployment Fails

**Check:**
1. Environment variables: `npm run validate:env`
2. Build locally: `npm run build`
3. TypeScript errors: `npx tsc --noEmit`
4. Test failures: `npm test`

**Solutions:**
- Review deployment logs in Vercel dashboard
- Check GitHub Actions logs
- Verify all secrets are set in Vercel

### Health Check Failing

**Check:**
1. Database connection
2. Cache connection
3. Environment variables
4. Supabase project status

**Solutions:**
```bash
# Test database connection
psql $DATABASE_POOLER_URL

# Test health endpoint
curl https://your-app.vercel.app/health?check=database
curl https://your-app.vercel.app/health?check=cache
```

### High Error Rate

**Immediate Actions:**
1. Check Sentry dashboard
2. Review recent deployment changes
3. Consider rollback if > 5% error rate

**Rollback:**
```bash
./scripts/rollback.sh
```

---

## Security

### Secret Management

**DO:**
- ✅ Use Vercel environment variables for secrets
- ✅ Rotate API keys every 90 days
- ✅ Use different keys per environment
- ✅ Enable 2FA on all services

**DON'T:**
- ❌ Commit secrets to git
- ❌ Share API keys in Slack/email
- ❌ Use production keys in development
- ❌ Leave default/example values

### Security Checklist

- [ ] All secrets stored in Vercel environment variables
- [ ] API keys scoped with minimum permissions
- [ ] CORS origins configured correctly
- [ ] Rate limiting enabled
- [ ] Webhook signatures verified
- [ ] HTTPS enforced
- [ ] Security headers configured

---

## Support & Resources

### Internal Resources
- [Main Documentation](../../README.md)
- [API Documentation](../api/README.md)
- [Database Schema](../database/SCHEMA.md)

### External Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Sentry Documentation](https://docs.sentry.io)

### Getting Help

**For deployment issues:**
1. Check this documentation
2. Review deployment logs
3. Check troubleshooting section
4. Contact DevOps team

**Emergency contacts:**
- Email: devops@yourcompany.com
- Slack: #tech-ops
- On-call: [PagerDuty link]

---

## Best Practices

### Before Deployment
1. Always run tests locally
2. Validate environment variables
3. Review changes being deployed
4. Have rollback plan ready
5. Notify team of deployment

### During Deployment
1. Monitor deployment progress
2. Watch for build errors
3. Don't deploy on Fridays (unless emergency)
4. Have someone on standby

### After Deployment
1. Monitor error rates for 1 hour
2. Test critical user flows
3. Check performance metrics
4. Document any issues
5. Celebrate success! 🎉

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-27 | Initial deployment documentation |

---

**Questions?** Check the documentation files above or contact the DevOps team.

**Ready to deploy?** Start with the [Deployment Checklist](./CHECKLIST.md).
