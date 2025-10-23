# Chronos AI - Setup Guide

This guide walks you through setting up the Chronos AI platform with **Whop MCP integration** for per-creator Supabase project provisioning.

## Prerequisites

Before you begin, ensure you have:

- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager
- [ ] Whop developer account ([dev.whop.com](https://dev.whop.com))
- [ ] Supabase account ([supabase.com](https://supabase.com))
- [ ] OpenAI API key ([platform.openai.com](https://platform.openai.com))
- [ ] Anthropic API key ([console.anthropic.com](https://console.anthropic.com))
- [ ] Git installed

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/chronos-ai.git
cd chronos-ai

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 4. Run database migrations
npm run db:migrate

# 5. Start development server
npm run dev
```

Visit `http://localhost:3000` to see the app running.

## Detailed Setup

### 1. Whop Setup

#### Create a Whop App

1. Go to [Whop Developer Dashboard](https://dev.whop.com)
2. Click **Create App**
3. Fill in app details:
   - **Name**: Chronos AI
   - **Description**: AI-powered video learning assistant
   - **Category**: Education
   - **Pricing**: Set up your pricing tiers (Starter, Pro, Enterprise)

4. Note down:
   - **API Key** (`WHOP_API_KEY`)
   - **Client ID** (`WHOP_CLIENT_ID`)
   - **Client Secret** (`WHOP_CLIENT_SECRET`)

#### Configure OAuth

1. In Whop Dashboard → App Settings → OAuth
2. Add redirect URI:
   ```
   http://localhost:3000/api/whop/callback
   ```
3. For production, add:
   ```
   https://your-app.vercel.app/api/whop/callback
   ```

#### Set up Webhooks

1. In Whop Dashboard → Webhooks
2. Add webhook URL:
   ```
   http://localhost:3000/api/webhooks/whop
   ```
   (Use ngrok for local testing: `ngrok http 3000`)

3. Select events:
   - ✅ `merchant_installed` (creator installs app)
   - ✅ `merchant_uninstalled` (creator uninstalls app)
   - ✅ `creator_purchase` (creator upgrades plan)
   - ✅ `creator_cancellation` (creator downgrades/cancels)

4. Copy **Webhook Secret** (`WHOP_WEBHOOK_SECRET`)

### 2. Supabase Setup

#### Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in details:
   - **Name**: chronos-ai
   - **Database Password**: (generate strong password)
   - **Region**: Choose closest to your users

4. Wait for project to provision (~2 minutes)

#### Get API Keys

1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **Anon public** key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **Service role** key (`SUPABASE_SERVICE_ROLE_KEY`) - **KEEP THIS SECRET!**

#### Enable pgvector Extension

1. Go to **Database** → **Extensions**
2. Search for `pgvector`
3. Click **Enable**

#### Run Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

Alternatively, run migrations manually in SQL Editor:

```sql
-- Go to SQL Editor in Supabase Dashboard
-- Copy/paste contents of supabase/migrations/*.sql files in order
```

#### Set up Storage Buckets

1. Go to **Storage** in Supabase Dashboard
2. Create buckets:
   - **videos** (Private, Max 500MB per file)
   - **assets** (Private, Max 10MB per file)
   - **thumbnails** (Public, Max 5MB per file)

3. For each bucket, set policies:

**Videos bucket policies:**
```sql
-- Creators can upload to their own folder
CREATE POLICY "Creators upload own videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] IN (
    SELECT handle FROM creators WHERE whop_user_id = auth.uid()::text
  )
);

-- Creators can read their own videos
CREATE POLICY "Creators read own videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] IN (
    SELECT handle FROM creators WHERE whop_user_id = auth.uid()::text
  )
);

-- Students can read enrolled creator videos
CREATE POLICY "Students read enrolled videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] IN (
    SELECT c.handle FROM creators c
    INNER JOIN students s ON s.creator_id = c.id
    WHERE s.whop_user_id = auth.uid()::text
  )
);
```

### 3. OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Name it `Chronos AI`
4. Copy the key (`OPENAI_API_KEY`) - **SAVE IT NOW, you won't see it again!**
5. Set up billing (required for Whisper and Embeddings APIs)

### 4. Anthropic Setup

1. Go to [Anthropic Console](https://console.anthropic.com)
2. Navigate to **API Keys**
3. Click **Create Key**
4. Copy the key (`ANTHROPIC_API_KEY`)
5. Set up billing for Claude API usage

### 5. Environment Variables

Edit `.env.local` with all your keys:

```bash
# Whop
WHOP_API_KEY=whop_xxxxxxxxxxxx
WHOP_MCP_URL=https://mcp.pipedream.net/v2
WHOP_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
WHOP_CLIENT_ID=xxxxxxxxxxxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# AI APIs
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 6. Test Local Setup

```bash
# Start development server
npm run dev

# In another terminal, test webhook endpoint
curl http://localhost:3000/api/webhooks/whop
# Should return: {"status":"healthy"...}
```

### 7. Test Creator Provisioning

Use a tool like Postman or curl to simulate a Whop webhook:

```bash
curl -X POST http://localhost:3000/api/webhooks/whop \
  -H "Content-Type: application/json" \
  -H "x-whop-signature: test-signature" \
  -d '{
    "action": "merchant_installed",
    "timestamp": "2025-10-22T00:00:00Z",
    "data": {
      "creator_id": "test-creator-123",
      "company_id": "company-456",
      "creator_slug": "test-creator",
      "company_name": "Test Company",
      "user_id": "user-789",
      "email": "creator@test.com"
    }
  }'
```

Check your Supabase database - you should see:
- New record in `creators` table
- Storage folders created: `test-creator/videos/`, `test-creator/assets/`

### 8. Deploy to Production

#### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### Set Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all variables from `.env.local`
3. For **WHOP_WEBHOOK_SECRET**, use different value for production
4. Update **NEXT_PUBLIC_APP_URL** to your Vercel URL

#### Update Whop Webhook URL

1. Go to Whop Dashboard → Webhooks
2. Update URL to: `https://your-app.vercel.app/api/webhooks/whop`
3. Test delivery

## Verification Checklist

- [ ] ✅ App runs on `http://localhost:3000`
- [ ] ✅ Webhook endpoint `/api/webhooks/whop` returns healthy status
- [ ] ✅ Supabase migrations applied successfully
- [ ] ✅ Storage buckets created with correct policies
- [ ] ✅ Test creator provisioning webhook succeeds
- [ ] ✅ Creator record appears in database
- [ ] ✅ Storage folders created for test creator
- [ ] ✅ OpenAI API key works (test with small transcription)
- [ ] ✅ Anthropic API key works (test with simple chat)

## Troubleshooting

### Common Issues

**1. "Supabase client not initialized"**
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Ensure variables start with `NEXT_PUBLIC_` for client-side access

**2. "Webhook signature verification failed"**
- For local testing, set `SKIP_WEBHOOK_VERIFICATION=true` in `.env.local`
- In production, ensure `WHOP_WEBHOOK_SECRET` matches Whop dashboard

**3. "OpenAI API error: Insufficient quota"**
- Add billing method to OpenAI account
- Check usage limits at [OpenAI Usage Dashboard](https://platform.openai.com/usage)

**4. "pgvector extension not found"**
- Enable pgvector in Supabase Dashboard → Database → Extensions
- Re-run migrations after enabling

**5. "Storage bucket not found"**
- Create buckets manually in Supabase Dashboard → Storage
- Names must match exactly: `videos`, `assets`, `thumbnails`

### Getting Help

- **Documentation**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture
- **GitHub Issues**: [Report bugs or feature requests](https://github.com/your-org/chronos-ai/issues)
- **Discord**: [Join our community](https://discord.gg/your-invite)

## Next Steps

Once setup is complete:

1. **Test Video Upload**: Upload a test video and verify processing pipeline
2. **Test RAG Chat**: Send a chat message and verify vector search works
3. **Customize UI**: Modify components in `components/` directory
4. **Add Analytics**: Integrate PostHog or similar for usage tracking
5. **Monitor Costs**: Track OpenAI/Anthropic API usage in respective dashboards

## Development Workflow

```bash
# Start dev server
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Build for production
npm run build

# Run production build locally
npm run start
```

## Project Structure

```
chronos-ai/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   └── webhooks/
│   │       └── whop/      # Whop webhook handler
│   └── dashboard/         # Creator/student dashboards
├── mcp/                   # Whop MCP integration
│   ├── mcpClient.ts       # MCP client
│   └── webhookHandler.ts  # Webhook logic
├── scripts/               # Provisioning scripts
│   ├── bootstrapCreator.ts
│   └── decommissionCreator.ts
├── lib/                   # Utility functions
│   ├── video/            # Video processing
│   └── supabase/         # Database helpers
├── supabase/
│   └── migrations/       # Database migrations
├── types/                # TypeScript types
└── components/           # React components
```

## Support

For questions or issues:
- Email: support@chronosai.com
- Discord: [Community Server](https://discord.gg/your-invite)
- Docs: [docs.chronosai.com](https://docs.chronosai.com)

## License

Proprietary - All rights reserved
