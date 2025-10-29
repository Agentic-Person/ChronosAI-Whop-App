# Deployment Quick Reference Card

**One-page reference for common deployment tasks**

---

## 🚀 Quick Deploy

```bash
# Method 1: GitHub Actions (Recommended)
git push origin main

# Method 2: Deployment Script
./scripts/deploy.sh

# Method 3: Vercel CLI
vercel --prod
```

---

## 🔄 Quick Rollback

```bash
# Interactive rollback
./scripts/rollback.sh

# Specific deployment
./scripts/rollback.sh https://app-abc123.vercel.app

# Via Vercel CLI
vercel promote [deployment-url]
```

---

## 🏥 Health Checks

```bash
# Production
curl https://your-app.vercel.app/health

# Local
curl http://localhost:3000/health

# Detailed
curl https://your-app.vercel.app/health?system=true

# Specific checks
curl https://your-app.vercel.app/health?check=database
curl https://your-app.vercel.app/health?check=cache
```

---

## ✅ Pre-Deployment Checklist

```bash
# 1. Validate environment
npm run validate:env

# 2. Run tests
npm test

# 3. Build locally
npm run build

# 4. Check git status
git status

# 5. Review changes
git log --oneline -5
```

---

## 📊 Monitoring Links

| Service | URL |
|---------|-----|
| Vercel Dashboard | https://vercel.com/dashboard |
| Sentry | https://sentry.io |
| PostHog | https://app.posthog.com |
| Supabase | https://app.supabase.com |
| GitHub Actions | https://github.com/[org]/[repo]/actions |

---

## 🔐 Environment Variables

```bash
# Validate
npm run validate:env

# Critical variables (must be set)
WHOP_API_KEY=whop_xxxx
ANTHROPIC_API_KEY=sk-ant-xxxx
OPENAI_API_KEY=sk-proj-xxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
```

See: `docs/deployment/ENVIRONMENT_VARIABLES.md`

---

## 📝 Common Commands

```bash
# Development
npm run dev                    # Start dev server
npm test                       # Run tests
npm run lint                   # Lint code

# Deployment
npm run validate:env           # Validate environment
npm run deploy                 # Deploy to production
npm run deploy:dry-run         # Test deployment
npm run rollback               # Rollback deployment

# Database
npm run db:migrate             # Apply migrations
npm run db:reset               # Reset database

# Monitoring
npm run health                 # Check local health
npm run health:prod            # Check production health
```

---

## 🚨 Emergency Procedures

### High Error Rate (> 5%)
```bash
# 1. Immediate rollback
./scripts/rollback.sh

# 2. Check Sentry
# Visit: https://sentry.io

# 3. Notify team
# Post in #tech-ops
```

### Database Down
```bash
# 1. Check Supabase status
# Visit: https://app.supabase.com

# 2. Test connection
psql $DATABASE_POOLER_URL

# 3. Review connection pool
# Check Supabase Dashboard → Database → Connection pooler
```

### Deployment Failed
```bash
# 1. Check logs
vercel logs [deployment-url]

# 2. Verify environment
npm run validate:env

# 3. Build locally
npm run build

# 4. Check GitHub Actions
# Visit: https://github.com/[org]/[repo]/actions
```

---

## 📈 Key Metrics

| Metric | Target | Alert |
|--------|--------|-------|
| Error Rate | < 0.1% | > 1% |
| Response Time (p95) | < 2s | > 5s |
| Database Latency | < 100ms | > 500ms |
| Uptime | > 99.9% | < 99% |

---

## 🔧 Troubleshooting

### Build Fails
1. Check TypeScript: `npx tsc --noEmit`
2. Check ESLint: `npm run lint`
3. Clear cache: `rm -rf .next node_modules && npm ci`
4. Review logs in Vercel dashboard

### Tests Fail
1. Run locally: `npm test`
2. Check test output
3. Fix failing tests
4. Commit and push

### Environment Variable Error
1. Run validation: `npm run validate:env`
2. Check variable format
3. Verify in Vercel dashboard
4. Review documentation

---

## 📞 Support Contacts

- **DevOps Team:** devops@yourcompany.com
- **Slack:** #tech-ops
- **Emergency:** [PagerDuty link]

---

## 📚 Documentation

- **Full Deployment Guide:** `docs/deployment/DEPLOYMENT.md`
- **Environment Variables:** `docs/deployment/ENVIRONMENT_VARIABLES.md`
- **Deployment Checklist:** `docs/deployment/CHECKLIST.md`
- **Deployment README:** `docs/deployment/README.md`

---

## 🎯 Deployment Workflow

```
1. Create Feature Branch
   ↓
2. Develop & Test Locally
   ↓
3. Create Pull Request
   ↓
4. PR Preview Deployed (automatic)
   ↓
5. Code Review & Approval
   ↓
6. Merge to Main
   ↓
7. Production Deploy (automatic)
   ↓
8. Post-Deploy Verification
   ↓
9. Monitor for 24 Hours
```

---

## ⚡ Pro Tips

1. **Never deploy on Friday** (unless emergency)
2. **Always have rollback ready**
3. **Monitor for at least 1 hour** after deployment
4. **Test critical flows** immediately after deploy
5. **Document all incidents**
6. **Celebrate successful deployments!** 🎉

---

**Print this page and keep it handy during deployments!**
