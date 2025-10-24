#!/bin/bash
cd /d/APS/Projects/whop/AI-Video-Learning-Assistant

echo "🔐 Pushing environment variables to Vercel production..."
echo ""

# WHOP_API_KEY
WHOP_API_KEY=$(grep "^WHOP_API_KEY=" .env.local | cut -d '=' -f2)
echo "Adding WHOP_API_KEY..."
echo "$WHOP_API_KEY" | vercel env add WHOP_API_KEY production

# NEXT_PUBLIC_WHOP_APP_ID
WHOP_APP_ID=$(grep "^NEXT_PUBLIC_WHOP_APP_ID=" .env.local | cut -d '=' -f2)
echo "Adding NEXT_PUBLIC_WHOP_APP_ID..."
echo "$WHOP_APP_ID" | vercel env add NEXT_PUBLIC_WHOP_APP_ID production

# WHOP_CLIENT_ID
WHOP_CLIENT_ID=$(grep "^WHOP_CLIENT_ID=" .env.local | cut -d '=' -f2)
echo "Adding WHOP_CLIENT_ID..."
echo "$WHOP_CLIENT_ID" | vercel env add WHOP_CLIENT_ID production

# WHOP_CLIENT_SECRET
WHOP_CLIENT_SECRET=$(grep "^WHOP_CLIENT_SECRET=" .env.local | cut -d '=' -f2)
echo "Adding WHOP_CLIENT_SECRET..."
echo "$WHOP_CLIENT_SECRET" | vercel env add WHOP_CLIENT_SECRET production

# WHOP_TOKEN_ENCRYPTION_KEY
WHOP_TOKEN_KEY=$(grep "^WHOP_TOKEN_ENCRYPTION_KEY=" .env.local | cut -d '=' -f2)
echo "Adding WHOP_TOKEN_ENCRYPTION_KEY..."
echo "$WHOP_TOKEN_KEY" | vercel env add WHOP_TOKEN_ENCRYPTION_KEY production

# WHOP_OAUTH_REDIRECT_URI
REDIRECT_URI="https://chronos-ai-platform.vercel.app/api/whop/auth/callback"
echo "Adding WHOP_OAUTH_REDIRECT_URI..."
echo "$REDIRECT_URI" | vercel env add WHOP_OAUTH_REDIRECT_URI production

# NEXT_PUBLIC_APP_URL
PROD_URL="https://chronos-ai-platform.vercel.app"
echo "Adding NEXT_PUBLIC_APP_URL..."
echo "$PROD_URL" | vercel env add NEXT_PUBLIC_APP_URL production

echo ""
echo "✅ All environment variables added to Vercel!"
echo ""
echo "🚀 Next step: Deploy to production with: vercel --prod"
