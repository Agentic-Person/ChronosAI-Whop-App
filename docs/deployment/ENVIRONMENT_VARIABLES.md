# Environment Variables Reference

Complete reference for all environment variables used in the Video Wizard application.

---

## Quick Reference

### Critical Production Variables

These MUST be set for production deployment:

```bash
# Application
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production

# Whop Integration
WHOP_API_KEY=whop_xxxxxxxxxxxx
NEXT_PUBLIC_WHOP_APP_ID=app_xxxxxxxxxxxx
WHOP_CLIENT_ID=xxxxxxxxxxxx
WHOP_CLIENT_SECRET=xxxxxxxxxxxx
WHOP_WEBHOOK_SECRET=whop_webhook_xxxxxxxxxxxx
WHOP_TOKEN_ENCRYPTION_KEY=64_char_hex_string

# Database
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
DATABASE_POOLER_URL=postgresql://...

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxx...
OPENAI_API_KEY=sk-proj-xxx...

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx...

# Cache & Queue
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=xxx...
INNGEST_EVENT_KEY=evt_xxx...
INNGEST_SIGNING_KEY=signkey-prod-xxx...

# Email
RESEND_API_KEY=re_xxx...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## Variable Categories

### 1. Application Configuration

#### `NEXT_PUBLIC_APP_URL`
- **Type:** Public
- **Required:** Yes
- **Description:** The production URL of your application
- **Example:** `https://video-wizard.vercel.app`
- **Used by:** OAuth redirects, email links, webhooks
- **Notes:** Must use HTTPS in production

#### `NODE_ENV`
- **Type:** Private
- **Required:** Yes
- **Description:** Environment mode
- **Values:** `development` | `production` | `test`
- **Example:** `production`
- **Notes:** Set automatically by Vercel

#### `LOG_LEVEL`
- **Type:** Private
- **Required:** No
- **Description:** Logging verbosity
- **Values:** `debug` | `info` | `warn` | `error`
- **Default:** `info`
- **Example:** `info`

---

### 2. Whop Integration

#### `WHOP_API_KEY`
- **Type:** Secret
- **Required:** Yes
- **Description:** Server-side API key for Whop API calls
- **Format:** Starts with `whop_`
- **Example:** `whop_xxxxxxxxxxxxxxxxxxxxxxxx`
- **Get from:** https://dev.whop.com/apps/[app-id]/api-keys
- **Permissions:** Full access to Whop API
- **Security:** Never expose in client code

#### `NEXT_PUBLIC_WHOP_APP_ID`
- **Type:** Public
- **Required:** Yes
- **Description:** Your Whop application ID
- **Format:** Starts with `app_`
- **Example:** `app_xxxxxxxxxxxx`
- **Get from:** Whop Developer Dashboard
- **Used by:** Client-side Whop SDK initialization

#### `WHOP_CLIENT_ID`
- **Type:** Private
- **Required:** Yes (for OAuth)
- **Description:** OAuth 2.0 client ID
- **Example:** `xxxxxxxxxxxxxxxxxxxx`
- **Get from:** Whop Developer Dashboard → OAuth Settings
- **Used by:** OAuth authorization flow

#### `WHOP_CLIENT_SECRET`
- **Type:** Secret
- **Required:** Yes (for OAuth)
- **Description:** OAuth 2.0 client secret
- **Example:** `xxxxxxxxxxxxxxxxxxxx`
- **Get from:** Whop Developer Dashboard → OAuth Settings
- **Security:** Rotate regularly, never commit to git

#### `WHOP_WEBHOOK_SECRET`
- **Type:** Secret
- **Required:** Yes
- **Description:** Secret for webhook signature verification
- **Format:** Starts with `whop_webhook_`
- **Example:** `whop_webhook_xxxxxxxxxxxx`
- **Get from:** Whop Developer Dashboard → Webhooks
- **Security:** Used to verify webhook authenticity

#### `WHOP_TOKEN_ENCRYPTION_KEY`
- **Type:** Secret
- **Required:** Yes
- **Description:** Key for encrypting stored Whop tokens
- **Format:** 64-character hexadecimal string
- **Example:** `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`
- **Generate:** `openssl rand -hex 32`
- **Security:** Never change after deployment (will invalidate all tokens)

#### `WHOP_OAUTH_REDIRECT_URI`
- **Type:** Private
- **Required:** Yes (for OAuth)
- **Description:** OAuth callback URL
- **Format:** `${NEXT_PUBLIC_APP_URL}/api/whop/auth/callback`
- **Example:** `https://your-app.vercel.app/api/whop/auth/callback`
- **Notes:** Must match exactly in Whop dashboard

#### Checkout URLs (Optional)
```bash
NEXT_PUBLIC_WHOP_BASIC_CHECKOUT_URL=https://whop.com/checkout/plan_xxx
NEXT_PUBLIC_WHOP_PRO_CHECKOUT_URL=https://whop.com/checkout/plan_xxx
NEXT_PUBLIC_WHOP_ENTERPRISE_CHECKOUT_URL=https://whop.com/checkout/plan_xxx
```

---

### 3. Database (Supabase)

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Type:** Public
- **Required:** Yes
- **Description:** Supabase project URL
- **Format:** `https://[project-ref].supabase.co`
- **Example:** `https://abcdefghijklmnop.supabase.co`
- **Get from:** Supabase Dashboard → Settings → API

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Type:** Public
- **Required:** Yes
- **Description:** Supabase anonymous (public) key
- **Format:** JWT token (starts with `eyJ`)
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Get from:** Supabase Dashboard → Settings → API
- **Notes:** Safe to expose (RLS policies protect data)

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Type:** Secret
- **Required:** Yes
- **Description:** Supabase service role key (bypasses RLS)
- **Format:** JWT token (starts with `eyJ`)
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Get from:** Supabase Dashboard → Settings → API
- **Security:** NEVER expose in client code, bypasses all RLS
- **Used by:** Admin operations, background jobs

#### `DATABASE_URL`
- **Type:** Secret
- **Required:** No (for direct connections)
- **Description:** Direct database connection string
- **Format:** `postgresql://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:5432/postgres`
- **Get from:** Supabase Dashboard → Settings → Database
- **Used by:** Migrations, admin scripts

#### `DATABASE_POOLER_URL`
- **Type:** Secret
- **Required:** Yes (recommended)
- **Description:** Connection pooler URL (pgBouncer)
- **Format:** `postgresql://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
- **Get from:** Supabase Dashboard → Settings → Database → Connection Pooler
- **Mode:** Transaction mode
- **Pool Size:** 20 connections recommended
- **Benefits:** Better performance, handles connection limits

---

### 4. AI Services

#### `ANTHROPIC_API_KEY`
- **Type:** Secret
- **Required:** Yes
- **Description:** Claude API key for chat responses
- **Format:** Starts with `sk-ant-api03-`
- **Example:** `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx`
- **Get from:** https://console.anthropic.com/settings/keys
- **Tier:** Pro tier recommended for production
- **Rate Limits:**
  - Standard: 50 RPM, 40K TPM
  - Pro: 1000 RPM, 400K TPM
- **Cost:** ~$3 per 1M input tokens, ~$15 per 1M output tokens

#### `OPENAI_API_KEY`
- **Type:** Secret
- **Required:** Yes
- **Description:** OpenAI API key for transcription and embeddings
- **Format:** Starts with `sk-proj-` or `sk-`
- **Example:** `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx`
- **Get from:** https://platform.openai.com/api-keys
- **Tier:** Tier 2+ recommended for production
- **Rate Limits (Tier 2):**
  - 5,000 RPM
  - 450,000 TPM
  - 200 image requests per minute
- **Cost:**
  - Whisper: $0.006 per minute
  - Embeddings (ada-002): $0.0001 per 1K tokens

---

### 5. Monitoring & Analytics

#### `SENTRY_DSN`
- **Type:** Public
- **Required:** Yes
- **Description:** Sentry Data Source Name for error tracking
- **Format:** `https://[key]@o[org-id].ingest.us.sentry.io/[project-id]`
- **Example:** `https://abc123@o123456.ingest.us.sentry.io/789012`
- **Get from:** Sentry Dashboard → Settings → Client Keys (DSN)
- **Notes:** Can be public (project-scoped)

#### `SENTRY_AUTH_TOKEN`
- **Type:** Secret
- **Required:** Yes (for source maps)
- **Description:** Sentry authentication token
- **Format:** Starts with `sntrys_`
- **Example:** `sntrys_xxxxxxxxxxxxxxxxxxxxxxxx`
- **Get from:** Sentry → Settings → Auth Tokens
- **Permissions:** `project:releases`, `project:write`
- **Used by:** CI/CD for uploading source maps

#### `SENTRY_ORG` & `SENTRY_PROJECT`
- **Type:** Private
- **Required:** Yes
- **Description:** Sentry organization and project slugs
- **Example:** `SENTRY_ORG=your-company`, `SENTRY_PROJECT=video-wizard`
- **Get from:** Sentry dashboard URL

#### `NEXT_PUBLIC_POSTHOG_KEY`
- **Type:** Public
- **Required:** No (recommended)
- **Description:** PostHog project API key
- **Format:** Starts with `phc_`
- **Example:** `phc_xxxxxxxxxxxxxxxxxxxxxxxx`
- **Get from:** PostHog → Project Settings → Project API Key
- **Used by:** Product analytics, feature flags

#### `NEXT_PUBLIC_POSTHOG_HOST`
- **Type:** Public
- **Required:** No
- **Default:** `https://app.posthog.com`
- **Description:** PostHog instance URL
- **Example:** `https://app.posthog.com` or self-hosted URL

---

### 6. Cache & Queue

#### Vercel KV (Redis)

#### `KV_URL`
- **Type:** Secret
- **Required:** Yes
- **Description:** Redis connection URL
- **Format:** `redis://default:[password]@[host].upstash.io:6379`
- **Get from:** Vercel Dashboard → Storage → KV → .env.local tab

#### `KV_REST_API_URL`
- **Type:** Private
- **Required:** Yes
- **Description:** Upstash Redis REST API URL
- **Format:** `https://[host].upstash.io`
- **Get from:** Vercel Dashboard → Storage → KV

#### `KV_REST_API_TOKEN`
- **Type:** Secret
- **Required:** Yes
- **Description:** REST API authentication token
- **Get from:** Vercel Dashboard → Storage → KV
- **Permissions:** Read & Write

#### `KV_REST_API_READ_ONLY_TOKEN`
- **Type:** Secret
- **Required:** No
- **Description:** Read-only REST API token
- **Get from:** Vercel Dashboard → Storage → KV
- **Use case:** Analytics, monitoring

#### Inngest (Job Queue)

#### `INNGEST_EVENT_KEY`
- **Type:** Secret
- **Required:** Yes
- **Description:** Event key for sending events to Inngest
- **Format:** Starts with `evt_`
- **Example:** `evt_xxxxxxxxxxxxxxxxxxxxxxxx`
- **Get from:** Inngest Dashboard → Manage → Keys

#### `INNGEST_SIGNING_KEY`
- **Type:** Secret
- **Required:** Yes
- **Description:** Signing key for webhook verification
- **Format:** Starts with `signkey-`
- **Example:** `signkey-prod-xxxxxxxxxxxxxxxx`
- **Get from:** Inngest Dashboard → Manage → Keys → Signing Keys
- **Notes:** Different keys for prod/staging

#### `INNGEST_ENV`
- **Type:** Private
- **Required:** No
- **Default:** `production`
- **Description:** Inngest environment name
- **Example:** `production`

---

### 7. Email Service (Resend)

#### `RESEND_API_KEY`
- **Type:** Secret
- **Required:** Yes
- **Description:** Resend API key for sending emails
- **Format:** Starts with `re_`
- **Example:** `re_xxxxxxxxxxxxxxxxxxxxxxxx`
- **Get from:** Resend Dashboard → API Keys
- **Rate Limits:** Based on plan tier

#### `RESEND_FROM_EMAIL`
- **Type:** Private
- **Required:** Yes
- **Description:** Sender email address
- **Format:** Valid email with verified domain
- **Example:** `noreply@yourdomain.com`
- **Notes:** Domain must be verified in Resend dashboard

#### `RESEND_REPLY_TO_EMAIL`
- **Type:** Private
- **Required:** No
- **Description:** Reply-to email address
- **Example:** `support@yourdomain.com`

---

### 8. Discord Integration (Optional - Enterprise)

#### `DISCORD_BOT_TOKEN`
- **Type:** Secret
- **Required:** No (Enterprise only)
- **Description:** Discord bot authentication token
- **Format:** `MTxxxxxxxxxxxxxxxxxx.xxxxxx.xxxxxxxxxxxxx`
- **Get from:** Discord Developer Portal → Bot → Token
- **Permissions:** Manage Channels, Send Messages, Read Messages

#### `DISCORD_CLIENT_ID`
- **Type:** Private
- **Required:** No (for OAuth)
- **Description:** Discord OAuth client ID
- **Format:** Numeric string
- **Example:** `123456789012345678`
- **Get from:** Discord Developer Portal → OAuth2

#### `DISCORD_CLIENT_SECRET`
- **Type:** Secret
- **Required:** No (for OAuth)
- **Description:** Discord OAuth client secret
- **Get from:** Discord Developer Portal → OAuth2

#### `DISCORD_GUILD_ID`
- **Type:** Private
- **Required:** No
- **Description:** Your Discord server ID
- **Format:** Numeric string
- **Example:** `123456789012345678`
- **Get from:** Right-click server → Copy ID (Developer Mode on)

#### `ENABLE_DISCORD_BOT`
- **Type:** Private
- **Required:** No
- **Default:** `false`
- **Description:** Enable/disable Discord bot features
- **Values:** `true` | `false`

---

### 9. YouTube Integration (Optional)

#### `YOUTUBE_API_KEY`
- **Type:** Secret
- **Required:** No (for video import feature)
- **Description:** YouTube Data API v3 key
- **Format:** Starts with `AIzaSy`
- **Example:** `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **Get from:** Google Cloud Console → APIs & Services → Credentials
- **Setup:**
  1. Create/select project
  2. Enable "YouTube Data API v3"
  3. Create API Key
  4. Restrict to YouTube Data API v3
- **Quota:** 10,000 units/day (default)
- **Cost:** Free tier available

---

### 10. Security & Encryption

#### `SESSION_SECRET`
- **Type:** Secret
- **Required:** No (recommended)
- **Description:** Secret for session cookie encryption
- **Format:** Random base64 string (32+ chars)
- **Generate:** `openssl rand -base64 32`
- **Example:** `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### `CSRF_SECRET`
- **Type:** Secret
- **Required:** No (recommended)
- **Description:** Secret for CSRF token generation
- **Format:** Random base64 string (32+ chars)
- **Generate:** `openssl rand -base64 32`

#### `RATE_LIMIT_REQUESTS_PER_MINUTE`
- **Type:** Private
- **Required:** No
- **Default:** `100`
- **Description:** Maximum requests per minute per IP
- **Example:** `100`

#### `RATE_LIMIT_REQUESTS_PER_HOUR`
- **Type:** Private
- **Required:** No
- **Default:** `1000`
- **Description:** Maximum requests per hour per IP
- **Example:** `1000`

#### `MAX_UPLOAD_SIZE`
- **Type:** Private
- **Required:** No
- **Default:** `524288000` (500MB)
- **Description:** Maximum file upload size in bytes
- **Example:** `524288000`

#### `ALLOWED_CORS_ORIGINS`
- **Type:** Private
- **Required:** No
- **Description:** Comma-separated list of allowed CORS origins
- **Example:** `https://yourdomain.com,https://www.yourdomain.com`

---

### 11. Feature Flags

#### `ENABLE_BETA_FEATURES`
- **Type:** Private
- **Required:** No
- **Default:** `false`
- **Description:** Enable beta/experimental features
- **Values:** `true` | `false`

#### `ENABLE_EXPERIMENTAL_AI`
- **Type:** Private
- **Required:** No
- **Default:** `false`
- **Description:** Enable experimental AI features
- **Values:** `true` | `false`

#### `MAINTENANCE_MODE`
- **Type:** Private
- **Required:** No
- **Default:** `false`
- **Description:** Enable maintenance mode
- **Values:** `true` | `false`
- **Effect:** Shows maintenance page to users

---

### 12. Vercel Auto-Set Variables

These are automatically set by Vercel (do not configure):

```bash
VERCEL=1
VERCEL_ENV=production|preview|development
VERCEL_URL=your-app-xxxxxxxxxxxx.vercel.app
VERCEL_GIT_COMMIT_SHA=abc123...
VERCEL_GIT_COMMIT_REF=main
VERCEL_GIT_REPO_OWNER=your-org
VERCEL_GIT_REPO_SLUG=video-wizard
```

---

## Validation

Run this script to validate your environment:

```bash
node scripts/validate-env.js
```

Checks:
- All required variables are set
- No placeholder values
- Correct format validation
- API key format verification

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.env.local` for local development
   - Add `.env*` to `.gitignore`

2. **Rotate secrets regularly**
   - API keys: Every 90 days
   - Webhook secrets: Every 180 days
   - Encryption keys: Only if compromised

3. **Use different keys per environment**
   - Development: Separate API keys
   - Staging: Separate project/keys
   - Production: Production-only keys

4. **Scope API keys appropriately**
   - Minimum required permissions
   - Separate keys for different services

5. **Monitor API key usage**
   - Set up billing alerts
   - Monitor for unusual activity
   - Rotate if suspicious activity detected

---

## Troubleshooting

### "Environment variable not found"

```bash
# Check if variable is set
echo $VARIABLE_NAME

# Validate all variables
node scripts/validate-env.js
```

### "Invalid API key format"

- Check for typos
- Verify key hasn't expired
- Ensure no extra whitespace
- Verify key from correct environment (dev vs prod)

### "CORS error"

- Check `ALLOWED_CORS_ORIGINS`
- Verify `NEXT_PUBLIC_APP_URL` is correct
- Ensure HTTPS in production

---

## Additional Resources

- [Deployment Guide](./DEPLOYMENT.md)
- [Security Best Practices](./SECURITY.md)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
