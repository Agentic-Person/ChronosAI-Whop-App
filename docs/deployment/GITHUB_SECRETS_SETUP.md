# GitHub Secrets Setup Guide

This guide walks you through configuring all required GitHub secrets for CI/CD automation.

---

## Overview

GitHub Actions requires specific secrets to be configured in your repository for automated deployments. This guide lists all required secrets and how to obtain them.

---

## Required Secrets

### 1. Vercel Deployment Secrets

#### `VERCEL_TOKEN`
- **Purpose:** Authenticate GitHub Actions to deploy to Vercel
- **How to get:**
  1. Go to https://vercel.com/account/tokens
  2. Click "Create Token"
  3. Name it: "GitHub Actions CI/CD"
  4. Set scope: Full Access (or scope to specific project)
  5. Copy the token (save it immediately - shown only once)
- **Example:** `xxxxxxxxxxxxxxxxxxxxxxxxxx`

#### `VERCEL_ORG_ID`
- **Purpose:** Identify your Vercel organization
- **How to get:**
  1. Go to Vercel Dashboard
  2. Settings → General
  3. Copy "Organization ID" or "Team ID"
- **Example:** `team_xxxxxxxxxxxxxxxxxxxx`

#### `VERCEL_PROJECT_ID`
- **Purpose:** Identify your Vercel project
- **How to get:**
  1. Go to your project in Vercel
  2. Settings → General
  3. Copy "Project ID"
- **Example:** `prj_xxxxxxxxxxxxxxxxxxxx`

---

### 2. Application Secrets

#### `NEXT_PUBLIC_APP_URL`
- **Purpose:** Production URL for OAuth redirects, webhooks
- **Value:** `https://your-app.vercel.app`
- **Example:** `https://video-wizard.vercel.app`

---

### 3. Whop Integration Secrets

#### `WHOP_API_KEY`
- **Purpose:** Server-side Whop API calls
- **How to get:**
  1. Go to https://dev.whop.com
  2. Select your app
  3. API Keys tab
  4. Create new API key
- **Example:** `whop_xxxxxxxxxxxxxxxxxxxx`

#### `NEXT_PUBLIC_WHOP_APP_ID`
- **Purpose:** Whop app identifier (public)
- **How to get:**
  1. Whop Developer Dashboard
  2. Your app details
  3. Copy App ID
- **Example:** `app_xxxxxxxxxxxx`

#### `WHOP_CLIENT_ID`
- **Purpose:** OAuth client ID
- **How to get:**
  1. Whop Developer Dashboard
  2. OAuth Settings
  3. Copy Client ID
- **Example:** `xxxxxxxxxxxxxxxxxxxx`

#### `WHOP_CLIENT_SECRET`
- **Purpose:** OAuth client secret
- **How to get:**
  1. Whop Developer Dashboard
  2. OAuth Settings
  3. Copy Client Secret
- **Security:** Mark as secret, never log
- **Example:** `xxxxxxxxxxxxxxxxxxxx`

#### `WHOP_WEBHOOK_SECRET`
- **Purpose:** Webhook signature verification
- **How to get:**
  1. Whop Developer Dashboard
  2. Webhooks tab
  3. Copy Webhook Secret
- **Example:** `whop_webhook_xxxxxxxxxxxx`

---

### 4. Database Secrets (Supabase)

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Purpose:** Supabase project URL (public)
- **How to get:**
  1. Supabase Dashboard
  2. Settings → API
  3. Copy "Project URL"
- **Example:** `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Purpose:** Public Supabase key (safe to expose)
- **How to get:**
  1. Supabase Dashboard
  2. Settings → API
  3. Copy "anon" key under "Project API keys"
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Purpose:** Admin access to Supabase (bypasses RLS)
- **How to get:**
  1. Supabase Dashboard
  2. Settings → API
  3. Copy "service_role" key
- **Security:** CRITICAL - never expose in client code
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

### 5. AI Service Secrets

#### `ANTHROPIC_API_KEY`
- **Purpose:** Claude API for chat responses
- **How to get:**
  1. Go to https://console.anthropic.com/
  2. Settings → API Keys
  3. Create key
  4. Copy key (shown only once)
- **Example:** `sk-ant-api03-xxxxxxxxxxxxxxxxxxxx`

#### `OPENAI_API_KEY`
- **Purpose:** OpenAI API for transcription & embeddings
- **How to get:**
  1. Go to https://platform.openai.com/api-keys
  2. Create new secret key
  3. Copy key (shown only once)
- **Example:** `sk-proj-xxxxxxxxxxxxxxxxxxxx`

---

### 6. Monitoring Secrets

#### `SENTRY_DSN`
- **Purpose:** Sentry error tracking DSN (can be public)
- **How to get:**
  1. Go to https://sentry.io
  2. Your project → Settings → Client Keys (DSN)
  3. Copy DSN
- **Example:** `https://xxxxxxxx@o123456.ingest.us.sentry.io/789012`

#### `SENTRY_AUTH_TOKEN`
- **Purpose:** Upload source maps to Sentry
- **How to get:**
  1. Sentry → Settings → Auth Tokens
  2. Create new token
  3. Name: "GitHub Actions"
  4. Scopes: `project:releases`, `project:write`
  5. Copy token
- **Example:** `sntrys_xxxxxxxxxxxxxxxxxxxx`

#### `SENTRY_ORG`
- **Purpose:** Sentry organization slug
- **How to get:**
  1. Look at Sentry dashboard URL
  2. Extract org name from: `https://sentry.io/organizations/{ORG_SLUG}/`
- **Example:** `your-company`

#### `SENTRY_PROJECT`
- **Purpose:** Sentry project slug
- **How to get:**
  1. Look at project URL
  2. Extract from: `https://sentry.io/organizations/{org}/projects/{PROJECT_SLUG}/`
- **Example:** `video-wizard`

---

### 7. Optional Secrets

#### `DISCORD_WEBHOOK_URL`
- **Purpose:** Send deployment notifications to Discord
- **How to get:**
  1. Discord Server Settings → Integrations → Webhooks
  2. Create webhook
  3. Copy webhook URL
- **Required:** No (for Discord notifications)
- **Example:** `https://discord.com/api/webhooks/...`

#### `NEXT_PUBLIC_POSTHOG_KEY`
- **Purpose:** PostHog analytics (public)
- **How to get:**
  1. PostHog Dashboard
  2. Project Settings → Project API Key
- **Required:** No (for analytics)
- **Example:** `phc_xxxxxxxxxxxxxxxxxxxx`

---

## How to Add Secrets to GitHub

### Method 1: GitHub Web Interface

1. Go to your repository on GitHub
2. Click "Settings" tab
3. In left sidebar, click "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Enter name (exactly as shown above)
6. Enter value
7. Click "Add secret"
8. Repeat for all secrets

### Method 2: GitHub CLI

```bash
# Install GitHub CLI
# https://cli.github.com/

# Login
gh auth login

# Add secrets
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID
gh secret set VERCEL_PROJECT_ID
# ... continue for all secrets
```

---

## Secrets Checklist

Use this checklist to ensure all secrets are configured:

### Required for Deployment
- [ ] `VERCEL_TOKEN`
- [ ] `VERCEL_ORG_ID`
- [ ] `VERCEL_PROJECT_ID`
- [ ] `NEXT_PUBLIC_APP_URL`

### Required for Application
- [ ] `WHOP_API_KEY`
- [ ] `NEXT_PUBLIC_WHOP_APP_ID`
- [ ] `WHOP_CLIENT_ID`
- [ ] `WHOP_CLIENT_SECRET`
- [ ] `WHOP_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `OPENAI_API_KEY`

### Required for Monitoring
- [ ] `SENTRY_DSN`
- [ ] `SENTRY_AUTH_TOKEN`
- [ ] `SENTRY_ORG`
- [ ] `SENTRY_PROJECT`

### Optional
- [ ] `DISCORD_WEBHOOK_URL`
- [ ] `NEXT_PUBLIC_POSTHOG_KEY`

---

## Verifying Secrets

After adding all secrets, verify they're set correctly:

1. Go to repository Settings → Secrets and variables → Actions
2. You should see all secrets listed (values are hidden)
3. Update timestamp shows when each was last modified

**Note:** You cannot view secret values after creation. If unsure, delete and recreate.

---

## Security Best Practices

### Do's ✅
- Use different keys for development and production
- Rotate secrets every 90 days
- Use minimal permissions/scopes
- Enable 2FA on all service accounts
- Document who has access to secrets

### Don'ts ❌
- Never commit secrets to git
- Never share secrets in Slack/email
- Never log secret values
- Don't reuse secrets across projects
- Don't use personal API keys for production

---

## Troubleshooting

### Secret Not Working

**Symptoms:**
- GitHub Actions fails with authentication error
- "Invalid token" or "Unauthorized" errors

**Solutions:**
1. Verify secret name matches exactly (case-sensitive)
2. Check secret value (no extra spaces/newlines)
3. Ensure secret hasn't expired
4. Verify permissions/scopes are correct
5. Regenerate secret if needed

### Secret Value Hidden

**Issue:** Cannot view secret value after creation

**Solutions:**
1. Delete existing secret
2. Retrieve value from original source
3. Create new secret with correct value

### CI/CD Fails After Adding Secrets

**Check:**
1. All required secrets are set
2. Secret names match workflow file
3. Secrets don't have extra whitespace
4. Values are current (not expired)

---

## Maintenance Schedule

### Weekly
- [ ] Review GitHub Actions logs for auth errors
- [ ] Check for expired credentials

### Monthly
- [ ] Audit which secrets are being used
- [ ] Remove unused secrets
- [ ] Verify all secrets are still valid

### Quarterly (Every 90 Days)
- [ ] Rotate all API keys and secrets
- [ ] Update documentation
- [ ] Review access logs
- [ ] Audit who has access to secrets

---

## Emergency Procedures

### Compromised Secret

If a secret is compromised:

1. **Immediately revoke** the secret in the original service
2. **Generate new** secret
3. **Update** in GitHub repository secrets
4. **Re-run** any failed deployments
5. **Document** incident
6. **Review** access logs for unauthorized usage

### Lost Access

If you lose access to a secret:

1. Check password manager
2. Check service dashboard
3. Generate new secret if possible
4. Contact service support if needed
5. Update GitHub secrets

---

## Support

**Questions about:**
- Vercel secrets: https://vercel.com/support
- GitHub secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- Specific services: See service documentation

**Internal support:**
- DevOps team: devops@yourcompany.com
- Slack: #tech-ops

---

## Additional Resources

- [GitHub Encrypted Secrets Docs](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Best Practices for Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Last Updated:** 2025-10-27
**Next Review:** 2025-11-27
