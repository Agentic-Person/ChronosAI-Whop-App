# Production Deployment Checklist

Use this checklist before every production deployment to ensure nothing is missed.

---

## Pre-Deployment (1-2 Days Before)

### Code Quality
- [ ] All unit tests passing locally (`npm test`)
- [ ] All integration tests passing (`npm run test:integration`)
- [ ] TypeScript errors resolved (`npx tsc --noEmit`)
- [ ] ESLint warnings addressed (`npm run lint`)
- [ ] Code reviewed and approved by at least one team member
- [ ] All TODO comments resolved or documented
- [ ] Console.logs removed from production code

### Database
- [ ] Database migrations reviewed
- [ ] Migration rollback strategy documented
- [ ] Database backup completed
- [ ] RLS policies verified
- [ ] Indexes optimized
- [ ] Connection pooling configured
- [ ] Test migrations on staging

### Environment
- [ ] All environment variables documented in `.env.production.example`
- [ ] Environment variables validated (`node scripts/validate-env.js`)
- [ ] No secrets in codebase (verified with git grep)
- [ ] API keys rotated if needed
- [ ] Webhook secrets configured

### Security
- [ ] CORS origins configured correctly
- [ ] Rate limiting tested
- [ ] SQL injection prevention verified (parameterized queries)
- [ ] XSS protection enabled (CSP headers)
- [ ] Webhook signature verification tested
- [ ] Authentication flows tested
- [ ] Authorization checks verified

### Performance
- [ ] Lighthouse audit passed (Performance > 90)
- [ ] Bundle size analyzed (`npm run build` and check .next/analyze)
- [ ] API endpoints optimized (< 2s p95)
- [ ] Database queries optimized
- [ ] Caching strategy implemented
- [ ] Image optimization configured

### Monitoring
- [ ] Sentry project created and configured
- [ ] PostHog analytics configured
- [ ] Vercel Analytics enabled
- [ ] Alert rules configured
- [ ] Error tracking tested
- [ ] Uptime monitoring configured

---

## Deployment Day

### Morning (Before Deployment)

#### 1. Final Verification
- [ ] Pull latest from main branch
- [ ] Run full test suite (`npm test && npm run test:integration`)
- [ ] Build locally succeeds (`npm run build`)
- [ ] Environment validation passes (`node scripts/validate-env.js`)

#### 2. Pre-deployment Communication
- [ ] Notify team in Slack/Discord about upcoming deployment
- [ ] Schedule maintenance window if needed
- [ ] Prepare rollback plan
- [ ] Have team member on standby for support

#### 3. Backup & Safety
- [ ] Database backup completed (automatic in Supabase)
- [ ] Current production deployment URL noted for rollback
- [ ] Rollback script tested (`./scripts/rollback.sh --dry-run`)

### Deployment Execution

#### Option A: Automated (GitHub Actions)
- [ ] Push to main branch
- [ ] Monitor GitHub Actions workflow
- [ ] Watch build logs for errors
- [ ] Verify all checks pass

#### Option B: Manual (CLI)
- [ ] Run deployment script: `./scripts/deploy.sh`
- [ ] Follow prompts and confirmations
- [ ] Monitor deployment progress
- [ ] Save deployment URL

### Post-Deployment (Immediate)

#### 1. Health Checks (First 5 Minutes)
- [ ] Health endpoint responds: `curl https://your-app.vercel.app/health`
- [ ] Database connectivity verified
- [ ] Cache connectivity verified
- [ ] Storage connectivity verified
- [ ] Expected HTTP 200 status

#### 2. Critical Path Testing (5-15 Minutes)
**Student Flow:**
- [ ] Login via Whop OAuth works
- [ ] Dashboard loads correctly
- [ ] Video playback works
- [ ] Chat interface functional
- [ ] Quiz loading works
- [ ] Calendar displays correctly

**Creator Flow:**
- [ ] Creator login works
- [ ] Video upload functional
- [ ] Processing queue working
- [ ] Analytics dashboard loads
- [ ] Student list accessible

#### 3. Error Monitoring (15-30 Minutes)
- [ ] Check Sentry dashboard - no new errors
- [ ] Error rate < 0.1%
- [ ] No 500 errors in logs
- [ ] API response times normal (< 2s p95)

#### 4. Performance Verification (30-60 Minutes)
- [ ] Lighthouse audit on production URL
- [ ] Performance score > 90
- [ ] Core Web Vitals passing
- [ ] No console errors in browser
- [ ] Network requests optimized

### Post-Deployment (First Hour)

- [ ] Monitor user signups (if applicable)
- [ ] Watch for support tickets
- [ ] Check analytics for traffic patterns
- [ ] Monitor database performance
- [ ] Review API costs (OpenAI, Anthropic usage)
- [ ] Verify email delivery (if tested)
- [ ] Check Discord notifications (if enabled)

---

## Post-Deployment (First 24 Hours)

### Hour 1-4: Active Monitoring
- [ ] Check Sentry every 30 minutes
- [ ] Monitor API response times
- [ ] Watch database query performance
- [ ] Check cache hit rates
- [ ] Review user feedback

### Hour 4-8: Stability Check
- [ ] No critical errors reported
- [ ] Performance metrics stable
- [ ] User flows working correctly
- [ ] No unusual traffic patterns
- [ ] API costs within expected range

### Hour 8-24: Optimization
- [ ] Review slow API endpoints
- [ ] Optimize database queries if needed
- [ ] Adjust cache TTLs if needed
- [ ] Document any issues found
- [ ] Plan fixes for minor issues

---

## Week 1 Operations

### Daily Tasks (First Week)
- [ ] **Morning:** Review Sentry errors from previous day
- [ ] **Morning:** Check key metrics dashboard
- [ ] **Midday:** Review user feedback/support tickets
- [ ] **Evening:** Check API usage and costs
- [ ] **Evening:** Review analytics trends

### Weekly Review (End of Week 1)
- [ ] Review all errors and fix critical ones
- [ ] Analyze performance trends
- [ ] Review API cost efficiency
- [ ] Update documentation based on learnings
- [ ] Plan optimization improvements
- [ ] Conduct team retrospective

---

## Rollback Triggers

Execute rollback immediately if:

- [ ] Error rate > 5%
- [ ] Critical feature completely broken
- [ ] Database connection failures
- [ ] Data corruption detected
- [ ] Security vulnerability discovered
- [ ] API costs unexpectedly high (> 200% normal)
- [ ] Complete service outage
- [ ] User data exposure

### Rollback Procedure
1. Run: `./scripts/rollback.sh`
2. Verify health endpoint returns 200
3. Test critical user flows
4. Notify team of rollback
5. Document incident
6. Investigate root cause
7. Plan fix deployment

---

## Success Criteria

Deployment is considered successful when:

- [x] All health checks passing
- [x] Error rate < 0.1%
- [x] API response times < 2s (p95)
- [x] No critical bugs reported
- [x] User signups working (if applicable)
- [x] Payment processing working (if applicable)
- [x] All critical features functional
- [x] Performance metrics within targets
- [x] No rollback required after 24 hours

---

## Communication Templates

### Pre-Deployment Announcement
```
🚀 **Production Deployment Scheduled**

Time: [Date/Time]
Duration: ~30 minutes
Expected Downtime: None
Impact: No user-facing changes expected

We'll be deploying [feature/fix description].

Rollback plan is ready if needed.
```

### Post-Deployment Success
```
✅ **Deployment Successful**

- Deployed: [commit SHA]
- Time: [timestamp]
- Status: All systems operational
- Health checks: Passing
- Critical paths: Verified

Monitoring for next 24 hours.
```

### Rollback Notification
```
⚠️ **Deployment Rollback Executed**

Previous deployment has been rolled back due to [reason].

Current status: [status]
Impact: [impact description]
Next steps: [action plan]

Incident documented in [link].
```

---

## Notes & Tips

### Before First Deployment
- Do a dry run of deployment process
- Test rollback procedure on staging
- Document all environment variables
- Set up monitoring dashboards
- Create incident response plan

### During Deployment
- Stay calm and methodical
- Follow checklist step by step
- Don't skip verification steps
- Document any anomalies
- Have rollback ready at all times

### After Deployment
- Don't leave immediately after deploying
- Monitor for at least 1 hour
- Document lessons learned
- Update procedures based on experience
- Celebrate successful deployments! 🎉

---

**Checklist Version:** 1.0
**Last Updated:** 2025-10-27
**Next Review:** After first production deployment
