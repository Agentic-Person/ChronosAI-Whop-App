# Production Environment Variables Checklist

**Last Updated:** October 28, 2025
**Version:** 1.0.0

This document provides a comprehensive checklist of all environment variables required for the AI Video Learning Assistant platform deployment.

---

## Quick Reference

- **Tier 1 (Critical):** 15 variables - Application will not function without these
- **Tier 2 (Important):** 14 variables - Core features degraded without these
- **Tier 3 (Optional):** 19 variables - Enhanced features require these

**Total Variables:** 48

---

## Tier 1: Critical Variables (REQUIRED for Staging & Production)

These variables are absolutely required. The application will fail to start or core functionality will break without them.

### 1. Whop Integration (Core Authentication)

| Variable | Required For | How to Obtain | Format/Validation | Example |
|----------|-------------|---------------|-------------------|---------|
| `WHOP_API_KEY` | All Whop API calls | 1. Login to [Whop Developer Dashboard](https://dev.whop.com)<br>2. Navigate to "API Keys"<br>3. Click "Create API Key"<br>4. Copy the key (shown once) | String, starts with `whop_` | `whop_abc123...` |
| `NEXT_PUBLIC_WHOP_APP_ID` | Frontend OAuth, client-side API | Whop Developer Dashboard → Your App → App ID | String, alphanumeric | `app_xyz789...` |
| `WHOP_CLIENT_ID` | OAuth login flow | Whop Developer Dashboard → OAuth → Client ID | String, alphanumeric | `client_abc123...` |
| `WHOP_CLIENT_SECRET` | OAuth token exchange (backend) | Whop Developer Dashboard → OAuth → Client Secret | String, alphanumeric (secret) | `secret_xyz789...` |
| `WHOP_WEBHOOK_SECRET` | Webhook signature verification | Whop Developer Dashboard → Webhooks → Signing Secret | String, alphanumeric (secret) | `whsec_abc123...` |
| `WHOP_TOKEN_ENCRYPTION_KEY` | Encrypt/decrypt user OAuth tokens | Generate with `scripts/generate-encryption-key.js` or `openssl rand -hex 32` | **64-character hexadecimal string** | `a1b2c3d4e5f6...` (64 chars) |

**Setup Steps:**
1. Create a Whop Developer account at https://dev.whop.com
2. Create a new app in the dashboard
3. Enable OAuth with redirect URL: `{YOUR_DOMAIN}/api/whop/auth/callback`
4. Enable webhooks pointing to: `{YOUR_DOMAIN}/api/webhooks/whop`
5. Generate all credentials above
6. **IMPORTANT:** Run `node scripts/generate-encryption-key.js` to create `WHOP_TOKEN_ENCRYPTION_KEY`

---

### 2. Supabase Database

| Variable | Required For | How to Obtain | Format/Validation | Example |
|----------|-------------|---------------|-------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | All database queries | Supabase Dashboard → Project Settings → API → Project URL | URL format: `https://*.supabase.co` | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side database access | Supabase Dashboard → Project Settings → API → `anon` `public` key | JWT string (long) | `eyJhbGciOiJIUzI1NiIsInR...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin database operations (backend only) | Supabase Dashboard → Project Settings → API → `service_role` key | JWT string (long, secret) | `eyJhbGciOiJIUzI1NiIsInR...` |

**Setup Steps:**
1. Create Supabase project at https://supabase.com
2. Navigate to Project Settings → API
3. Copy all three values above
4. **IMPORTANT:** Enable pgvector extension in SQL Editor: `CREATE EXTENSION IF NOT EXISTS vector;`
5. Run migrations in `supabase/migrations/` folder

**Security Note:**
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (RLS) - use only in server-side code
- Never expose `service_role` key to frontend

---

### 3. AI Services

| Variable | Required For | How to Obtain | Format/Validation | Example |
|----------|-------------|---------------|-------------------|---------|
| `ANTHROPIC_API_KEY` | AI chat, quiz generation | 1. Create account at https://console.anthropic.com<br>2. Navigate to API Keys<br>3. Click "Create Key" | String, starts with `sk-ant-` | `sk-ant-api03-abc...` |
| `OPENAI_API_KEY` | Video transcription (Whisper), embeddings | 1. Create account at https://platform.openai.com<br>2. Navigate to API Keys<br>3. Click "Create new secret key" | String, starts with `sk-` | `sk-proj-abc123...` |

**Setup Steps:**
1. **Anthropic:** Create account, enable billing (Claude 3.5 Sonnet model)
2. **OpenAI:** Create account, enable billing (Whisper + text-embedding-ada-002 model)
3. Set usage limits to prevent overages
4. Monitor costs in respective dashboards

**Cost Estimates (Monthly):**
- Anthropic: ~$50-200 for 1000 active users (chat + quiz generation)
- OpenAI: ~$30-100 for 100 hours of video transcription + embeddings

---

### 4. Application Configuration

| Variable | Required For | How to Obtain | Format/Validation | Example |
|----------|-------------|---------------|-------------------|---------|
| `NEXT_PUBLIC_APP_URL` | OAuth redirects, absolute URLs | Your deployed domain | Full URL with https:// (no trailing slash) | `https://mentora.app` |
| `NODE_ENV` | Environment detection | Set by platform | `development`, `staging`, or `production` | `production` |

**Setup Steps:**
1. For staging: Use Vercel preview URL (e.g., `https://mentora-git-staging.vercel.app`)
2. For production: Use custom domain (e.g., `https://mentora.app`)
3. Update Whop OAuth redirect URI to match `NEXT_PUBLIC_APP_URL`

---

## Tier 2: Important Variables (Core Features Degraded Without)

These variables enable critical features. The app will run, but key functionality will be broken or missing.

### 5. YouTube Integration (Video Import Feature)

| Variable | Required For | How to Obtain | Format/Validation | Example |
|----------|-------------|---------------|-------------------|---------|
| `YOUTUBE_API_KEY` | Import videos from YouTube URLs | 1. Go to [Google Cloud Console](https://console.cloud.google.com)<br>2. Create/select project<br>3. Enable "YouTube Data API v3"<br>4. Credentials → Create API Key<br>5. (Optional) Restrict key to YouTube API only | String, alphanumeric | `AIzaSyDabc123...` |

**Setup Steps:**
1. Create Google Cloud project
2. Enable YouTube Data API v3 in API Library
3. Create credentials (API Key)
4. **Recommended:** Restrict key:
   - Application restrictions: HTTP referrers (add your domain)
   - API restrictions: YouTube Data API v3 only
5. Monitor quota usage (default: 10,000 units/day)

**Quota Management:**
- Each video import costs ~5 units
- Monitor usage in Google Cloud Console
- Request quota increase if needed

---

### 6. Whop Plan Checkout URLs (Pricing Page)

| Variable | Required For | How to Obtain | Format/Validation | Example |
|----------|-------------|---------------|-------------------|---------|
| `NEXT_PUBLIC_WHOP_BASIC_CHECKOUT_URL` | Basic plan subscription | Whop Dashboard → Plans → Basic Plan → Checkout Link | Full Whop checkout URL | `https://whop.com/checkout/plan_basic123` |
| `NEXT_PUBLIC_WHOP_PRO_CHECKOUT_URL` | Pro plan subscription | Whop Dashboard → Plans → Pro Plan → Checkout Link | Full Whop checkout URL | `https://whop.com/checkout/plan_pro456` |
| `NEXT_PUBLIC_WHOP_ENTERPRISE_CHECKOUT_URL` | Enterprise plan subscription | Whop Dashboard → Plans → Enterprise Plan → Checkout Link | Full Whop checkout URL | `https://whop.com/checkout/plan_ent789` |

**Setup Steps:**
1. Create pricing plans in Whop Dashboard
2. Configure plan features and pricing
3. Copy checkout links for each plan
4. **Fallback:** If not set, pricing page will show "Contact Sales" for all plans

---

### 7. Caching (Vercel KV / Upstash Redis)

| Variable | Required For | How to Obtain | Format/Validation | Example |
|----------|-------------|---------------|-------------------|---------|
| `KV_URL` | Redis connection (primary) | Vercel Dashboard → Storage → KV → Connection String | Redis URL format | `redis://default:abc@redis.upstash.io:6379` |
| `KV_REST_API_URL` | REST-based Redis access | Vercel Dashboard → Storage → KV → REST API | HTTPS URL | `https://redis.upstash.io/...` |
| `KV_REST_API_TOKEN` | REST API authentication | Vercel Dashboard → Storage → KV → REST Token | String (secret) | `AaAbBbCcDdEe...` |
| `KV_REST_API_READ_ONLY_TOKEN` | Read-only REST access | Vercel Dashboard → Storage → KV → Read-only Token | String (secret) | `XxYyZzAaBbCc...` |

**Setup Steps:**
1. Create Vercel KV database in Vercel Dashboard
2. Link to your project
3. Copy all connection strings
4. **Alternative:** Use Upstash Redis directly (same format)

**Purpose:**
- Rate limiting (API request throttling)
- Session caching (faster authentication checks)
- Query result caching (reduce database load)

**Fallback:** If not configured, rate limiting will be disabled and database queries will be slower.

---

### 8. Background Jobs (Inngest)

| Variable | Required For | How to Obtain | Format/Validation | Example |
|----------|-------------|---------------|-------------------|---------|
| `INNGEST_EVENT_KEY` | Trigger background jobs | 1. Create account at https://www.inngest.com<br>2. Create app<br>3. Copy Event Key | Starts with `evt_` | `evt_abc123...` |
| `INNGEST_SIGNING_KEY` | Webhook signature verification | Inngest Dashboard → App Settings → Signing Key | Starts with `sig_` | `sig_xyz789...` |

**Setup Steps:**
1. Create Inngest account (free tier available)
2. Create new app
3. Copy both keys from dashboard
4. Deploy Inngest functions to `/api/inngest`

**Purpose:**
- Video processing pipeline (transcription, chunking, embeddings)
- Scheduled tasks (cleanup, analytics aggregation)
- Retry logic for failed operations

**Fallback:** Video processing will be synchronous (slower, less reliable)

---

### 9. Email (Resend)

| Variable | Required For | How to Obtain | Format/Validation | Example |
|----------|-------------|---------------|-------------------|---------|
| `RESEND_API_KEY` | Transactional emails | 1. Create account at https://resend.com<br>2. Verify domain<br>3. Create API key | Starts with `re_` | `re_abc123...` |
| `RESEND_FROM_EMAIL` | Email sender address | Your verified domain | Valid email format | `noreply@mentora.app` |

**Setup Steps:**
1. Create Resend account (free tier: 100 emails/day)
2. Add and verify your domain (DNS records)
3. Create API key
4. Set `RESEND_FROM_EMAIL` to `noreply@{YOUR_DOMAIN}`

**Purpose:**
- Welcome emails
- Password reset emails
- Course completion notifications
- Weekly progress reports

**Fallback:** Email features disabled (users won't receive notifications)

---

### 10. Monitoring & Error Tracking

| Variable | Required For | How to Obtain | Format/Validation | Example |
|----------|-------------|---------------|-------------------|---------|
| `SENTRY_DSN` | Error tracking | 1. Create account at https://sentry.io<br>2. Create project (Next.js)<br>3. Copy DSN | URL format: `https://{key}@{org}.ingest.sentry.io/{project}` | `https://abc@o123.ingest.sentry.io/456` |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics, feature flags | 1. Create account at https://posthog.com<br>2. Create project<br>3. Copy project API key | String starting with `phc_` | `phc_abc123...` |

**Setup Steps:**
1. **Sentry:** Create project → Copy DSN → Enable source maps upload
2. **PostHog:** Create project → Copy API key → Configure event tracking

**Purpose:**
- Crash reports and error monitoring (Sentry)
- User analytics and feature usage (PostHog)
- Performance monitoring
- Feature flags for gradual rollouts

**Fallback:** No error tracking or analytics (flying blind in production)

---

## Tier 3: Optional Variables (Enhanced Features)

These variables enable additional features but are not required for core functionality.

### 11. Discord Bot (ENTERPRISE Tier Feature)

| Variable | Required For | How to Obtain | Format/Validation | Example |
|----------|-------------|---------------|-------------------|---------|
| `DISCORD_BOT_TOKEN` | Discord bot authentication | 1. Go to [Discord Developer Portal](https://discord.com/developers)<br>2. Create application<br>3. Bot tab → Reset Token | String (secret) | `MTA1Nz...` |
| `DISCORD_CLIENT_ID` | Discord OAuth | Discord Developer Portal → OAuth2 → Client ID | Numeric string | `1234567890123456789` |
| `DISCORD_CLIENT_SECRET` | Discord OAuth token exchange | Discord Developer Portal → OAuth2 → Client Secret | String (secret) | `abc123...` |
| `DISCORD_GUILD_ID` | Target Discord server | Right-click server → Copy ID (Developer Mode enabled) | Numeric string | `9876543210987654321` |
| `ENABLE_DISCORD_BOT` | Enable/disable bot features | Manually set | `true` or `false` | `false` |

**Setup Steps:**
1. Create Discord application in Developer Portal
2. Enable bot features and intents (Message Content Intent)
3. Invite bot to your server
4. Copy all credentials
5. Set `ENABLE_DISCORD_BOT=true` only for production

**Purpose:**
- Auto-create team channels
- Progress notifications in Discord
- AI chat via Discord bot commands
- Weekly leaderboards

**Fallback:** Discord integration disabled (no bot commands)

---

### 12. Advanced Monitoring (Sentry Advanced)

| Variable | Required For | How to Obtain | Format/Validation | Example |
|----------|-------------|---------------|-------------------|---------|
| `SENTRY_AUTH_TOKEN` | Source map uploads, release tracking | Sentry → Settings → Auth Tokens → Create Token | String (secret) | `sntrys_abc123...` |
| `SENTRY_ORG` | Organization identifier | Sentry → Settings → Organization → Slug | String, lowercase | `mentora` |
| `SENTRY_PROJECT` | Project identifier | Sentry → Project Settings → Name | String, lowercase | `mentora` |

**Setup Steps:**
1. Create auth token in Sentry (scopes: `project:releases`, `org:read`)
2. Copy organization slug from URL (e.g., `sentry.io/organizations/{slug}/`)
3. Copy project name from project settings

**Purpose:**
- Upload source maps for better error stack traces
- Track releases and deployments
- Associate errors with specific commits

**Fallback:** Errors tracked but without source maps (harder to debug)

---

### 13. Development & Debugging

| Variable | Required For | How to Obtain | Format/Validation | Example |
|----------|-------------|---------------|-------------------|---------|
| `LOG_LEVEL` | Control logging verbosity | Manually set | `debug`, `info`, `warn`, `error` | `info` |

**Setup Steps:**
- Staging: `LOG_LEVEL=debug` (verbose logging)
- Production: `LOG_LEVEL=info` (normal logging)

**Purpose:**
- Debug issues in staging
- Reduce log noise in production

---

## Environment-Specific Configuration

### Staging Environment

```bash
# Core (same as production but with staging URLs)
NEXT_PUBLIC_APP_URL=https://mentora-git-staging.vercel.app
NODE_ENV=production  # Vercel sets this automatically

# Whop OAuth Redirect (update in Whop Dashboard)
WHOP_OAUTH_REDIRECT_URI=https://mentora-git-staging.vercel.app/api/whop/auth/callback

# Logging (more verbose)
LOG_LEVEL=debug

# Optional: Separate Supabase project for staging
# (Recommended to avoid corrupting production data)
```

### Production Environment

```bash
# Core
NEXT_PUBLIC_APP_URL=https://mentora.app
NODE_ENV=production

# Whop OAuth Redirect (update in Whop Dashboard)
WHOP_OAUTH_REDIRECT_URI=https://mentora.app/api/whop/auth/callback

# Logging (less verbose)
LOG_LEVEL=info

# Enable all monitoring
SENTRY_DSN=...
NEXT_PUBLIC_POSTHOG_KEY=...
```

---

## Security Best Practices

### Never Commit These Variables
- ❌ `WHOP_CLIENT_SECRET`
- ❌ `WHOP_WEBHOOK_SECRET`
- ❌ `WHOP_TOKEN_ENCRYPTION_KEY`
- ❌ `SUPABASE_SERVICE_ROLE_KEY`
- ❌ `ANTHROPIC_API_KEY`
- ❌ `OPENAI_API_KEY`
- ❌ All `*_SECRET`, `*_TOKEN`, `*_KEY` variables

### Always Use Environment Variables
- ✅ Store in Vercel Dashboard (Settings → Environment Variables)
- ✅ Use `.env.local` for local development (add to `.gitignore`)
- ✅ Rotate keys regularly (quarterly)
- ✅ Use separate keys for staging and production

### Validation
- ✅ Run `node scripts/validate-env.js` before deployment
- ✅ Verify all Tier 1 variables are set
- ✅ Check format (hex strings, URLs, etc.)

---

## Validation Checklist

Before deploying to staging or production, verify:

- [ ] All Tier 1 variables are set (15 variables)
- [ ] All Tier 2 variables are set (14 variables) or fallbacks acceptable
- [ ] `WHOP_TOKEN_ENCRYPTION_KEY` is exactly 64 hexadecimal characters
- [ ] `NEXT_PUBLIC_APP_URL` matches deployed domain (no trailing slash)
- [ ] Whop OAuth redirect URI updated in Whop Dashboard
- [ ] Whop webhook URL updated in Whop Dashboard
- [ ] Supabase pgvector extension enabled
- [ ] All API keys have billing enabled and usage limits set
- [ ] Run health check after deployment: `curl https://{DOMAIN}/api/health`

---

## Troubleshooting

### Common Issues

**1. Whop OAuth fails with "Invalid redirect_uri"**
- Solution: Update `WHOP_OAUTH_REDIRECT_URI` in Whop Developer Dashboard
- Must match: `{NEXT_PUBLIC_APP_URL}/api/whop/auth/callback`

**2. Database queries fail with "column does not exist"**
- Solution: Run migrations: `npm run db:migrate`
- Check Supabase logs for specific errors

**3. Video embeddings fail**
- Solution: Enable pgvector extension: `CREATE EXTENSION vector;`
- Verify `OPENAI_API_KEY` is valid and has billing enabled

**4. Webhook signature verification fails**
- Solution: Check `WHOP_WEBHOOK_SECRET` matches Whop Dashboard
- Ensure raw request body is used (not parsed JSON)

**5. Encryption errors with "Invalid key length"**
- Solution: Regenerate `WHOP_TOKEN_ENCRYPTION_KEY` with `node scripts/generate-encryption-key.js`
- Must be exactly 64 hexadecimal characters (32 bytes)

---

## Quick Start: Minimal Viable Configuration

For a quick staging deployment with core features only:

```bash
# Tier 1 Only (15 variables)
WHOP_API_KEY=...
NEXT_PUBLIC_WHOP_APP_ID=...
WHOP_CLIENT_ID=...
WHOP_CLIENT_SECRET=...
WHOP_WEBHOOK_SECRET=...
WHOP_TOKEN_ENCRYPTION_KEY=...  # Generate with script
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
NEXT_PUBLIC_APP_URL=https://your-staging-url.vercel.app
NODE_ENV=production
LOG_LEVEL=debug
```

This configuration provides:
- ✅ Whop authentication
- ✅ Database access
- ✅ AI chat and quiz generation
- ✅ Video transcription and embeddings
- ❌ No YouTube import
- ❌ No caching (slower)
- ❌ No email notifications
- ❌ No error monitoring
- ❌ No Discord bot

---

## Support & Resources

- **Whop Documentation:** https://docs.whop.com
- **Supabase Documentation:** https://supabase.com/docs
- **Anthropic API Docs:** https://docs.anthropic.com
- **OpenAI API Docs:** https://platform.openai.com/docs
- **Vercel Environment Variables:** https://vercel.com/docs/environment-variables

---

**Last Updated:** October 28, 2025
**Document Version:** 1.0.0
**Maintainer:** DevOps Team
