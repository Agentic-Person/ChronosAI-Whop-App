# Whop App Configuration Checklist

## ✅ Vercel Deployment Status

**Latest Commit:** `e3b2b67` - Critical fixes pushed  
**Status:** Should auto-deploy via Vercel GitHub integration

### Check Vercel Deployment:
1. Go to: https://vercel.com/dashboard
2. Find your project: `ChronosAI-Whop-App` (or your project name)
3. Check latest deployment:
   - Should show commit `e3b2b67`
   - Status should be "Building" or "Ready"
   - If failed, check build logs for errors

### Verify Deployment URL:
Your app should be accessible at:
- Production: `https://your-app.vercel.app`
- Or check Vercel dashboard for the exact URL

---

## 🔍 Whop App Configuration Checklist

### Step 1: Verify App is Created in Whop Dashboard
**Location:** https://dev.whop.com

- [ ] App is created in Whop Developer Dashboard
- [ ] App Name is set (e.g., "ChronosAI" or "Video Wizard")
- [ ] App Description is filled out
- [ ] App Category is selected

### Step 2: App Status & Visibility
**Critical:** App must be **Published** to show in marketplace

- [ ] App Status is set to **"Published"** (NOT "Draft")
- [ ] App is visible in marketplace (if required)
- [ ] App listing page is configured

### Step 3: App URL Configuration
**Location:** Whop Dashboard → Your App → Settings → App URL

- [ ] App URL points to your Vercel deployment: `https://your-app.vercel.app`
- [ ] Install endpoint is configured: `/api/whop/install`
- [ ] Full install URL: `https://your-app.vercel.app/api/whop/install`

### Step 4: OAuth Configuration
**Location:** Whop Dashboard → Your App → OAuth Settings

- [ ] OAuth Client ID is configured
- [ ] OAuth Client Secret is set (and matches Vercel env vars)
- [ ] Redirect URI is configured:
  - Production: `https://your-app.vercel.app/api/whop/auth/callback`
  - Development: `http://localhost:3000/api/whop/auth/callback` (if needed)
- [ ] Scopes are selected:
  - `openid`
  - `profile`
  - `email`
  - `memberships`

### Step 5: Webhook Configuration
**Location:** Whop Dashboard → Your App → Webhooks

- [ ] Webhook endpoint is configured: `https://your-app.vercel.app/api/whop/webhooks`
- [ ] Webhook secret is set (and matches Vercel env vars)
- [ ] Events are subscribed:
  - `membership.created`
  - `membership.went_valid`
  - `membership.went_invalid`
  - `membership.deleted`
  - `payment.succeeded`
  - `payment.failed`
- [ ] Webhook is tested and receiving events

### Step 6: API Keys
**Location:** Whop Dashboard → Your App → API Keys

- [ ] API Key is created
- [ ] API Key is added to Vercel environment variables as `WHOP_API_KEY`
- [ ] App ID is copied and added to Vercel as `NEXT_PUBLIC_WHOP_APP_ID`

### Step 7: Products & Plans
**Location:** Whop Dashboard → Your App → Products

- [ ] Products are created:
  - Basic Plan
  - Pro Plan
  - Enterprise Plan
- [ ] Product IDs are noted
- [ ] Pricing is configured
- [ ] Product IDs are added to code (or environment variables)

---

## 🔧 Environment Variables in Vercel

Verify these are set in Vercel Dashboard → Settings → Environment Variables:

### Required for Whop Integration:
- [ ] `WHOP_API_KEY` - Your Whop API key
- [ ] `NEXT_PUBLIC_WHOP_APP_ID` - Your Whop App ID
- [ ] `WHOP_CLIENT_ID` - OAuth Client ID
- [ ] `WHOP_CLIENT_SECRET` - OAuth Client Secret (NO trailing newlines!)
- [ ] `WHOP_WEBHOOK_SECRET` - Webhook verification secret
- [ ] `NEXT_PUBLIC_APP_URL` - Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)

### Required for App Functionality:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

---

## 🧪 Testing Checklist

### Test Install Endpoint:
```bash
curl -X POST https://your-app.vercel.app/api/whop/install \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "test_company",
    "user_id": "test_user",
    "company_name": "Test Company"
  }'
```

Expected: `200 OK` with success message

### Test Health Endpoint:
```bash
curl https://your-app.vercel.app/health
```

Expected: `200 OK` with health status

### Test OAuth Login:
```bash
# Should redirect to Whop OAuth
curl https://your-app.vercel.app/api/whop/auth/login
```

Expected: Redirect to Whop OAuth page

---

## 🚨 Common Issues & Fixes

### Issue: App Not Showing in Whop Marketplace
**Fix:**
1. Check app status is "Published" (not "Draft")
2. Verify app URL is configured correctly
3. Check if app needs approval (some apps require review)
4. Verify install endpoint is accessible

### Issue: OAuth Redirect Fails
**Fix:**
1. Verify redirect URI matches exactly (no trailing slash)
2. Check `WHOP_CLIENT_ID` and `WHOP_CLIENT_SECRET` in Vercel
3. Ensure no trailing newlines in environment variables
4. Use `printf` instead of `echo` when setting env vars

### Issue: Webhooks Not Receiving Events
**Fix:**
1. Verify webhook URL is correct
2. Check webhook secret matches
3. Test webhook endpoint manually
4. Check Vercel function logs for errors

---

## 📝 Next Steps

1. **Check Vercel Dashboard** - Verify deployment succeeded
2. **Verify Whop Dashboard** - Check all configuration items above
3. **Test Endpoints** - Use curl commands above to test
4. **Check Logs** - Monitor Vercel function logs for errors
5. **Test Install Flow** - Try installing app from Whop marketplace

---

**Last Updated:** After commit `e3b2b67`  
**Deployment URL:** Check Vercel dashboard for your project URL

