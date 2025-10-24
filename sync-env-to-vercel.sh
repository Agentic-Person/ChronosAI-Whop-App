#!/bin/bash
# Sync Environment Variables to Vercel
# This script reads from .env.local and sets them in Vercel for production

set -e

echo "🔐 Syncing Environment Variables to Vercel"
echo "=========================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please create .env.local with your environment variables"
    exit 1
fi

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel"
    echo "🔑 Please login first: vercel login"
    exit 1
fi

echo "📋 Reading environment variables from .env.local..."
echo ""

# Function to add environment variable to Vercel
add_env_var() {
    local var_name=$1
    local var_value=$2

    if [ -z "$var_value" ]; then
        echo "⚠️  Skipping $var_name (empty value)"
        return
    fi

    echo "Adding $var_name..."
    echo "$var_value" | vercel env add "$var_name" production --force
}

# Required OAuth variables
echo "🔑 Setting OAuth Configuration..."
WHOP_API_KEY=$(grep "^WHOP_API_KEY=" .env.local | cut -d '=' -f2-)
add_env_var "WHOP_API_KEY" "$WHOP_API_KEY"

WHOP_APP_ID=$(grep "^NEXT_PUBLIC_WHOP_APP_ID=" .env.local | cut -d '=' -f2-)
add_env_var "NEXT_PUBLIC_WHOP_APP_ID" "$WHOP_APP_ID"

WHOP_CLIENT_ID=$(grep "^WHOP_CLIENT_ID=" .env.local | cut -d '=' -f2-)
add_env_var "WHOP_CLIENT_ID" "$WHOP_CLIENT_ID"

WHOP_CLIENT_SECRET=$(grep "^WHOP_CLIENT_SECRET=" .env.local | cut -d '=' -f2-)
add_env_var "WHOP_CLIENT_SECRET" "$WHOP_CLIENT_SECRET"

WHOP_TOKEN_ENCRYPTION_KEY=$(grep "^WHOP_TOKEN_ENCRYPTION_KEY=" .env.local | cut -d '=' -f2-)
add_env_var "WHOP_TOKEN_ENCRYPTION_KEY" "$WHOP_TOKEN_ENCRYPTION_KEY"

echo ""
echo "📝 You need to manually set these with your production URLs:"
echo ""
echo "WHOP_OAUTH_REDIRECT_URI=https://your-app.vercel.app/api/whop/auth/callback"
echo "NEXT_PUBLIC_APP_URL=https://your-app.vercel.app"
echo ""
read -p "Enter your production URL (e.g., chronos-ai.vercel.app): " PROD_URL

if [ ! -z "$PROD_URL" ]; then
    # Add protocol if not present
    if [[ ! $PROD_URL =~ ^https?:// ]]; then
        PROD_URL="https://$PROD_URL"
    fi

    echo ""
    echo "Setting production URLs..."
    REDIRECT_URI="${PROD_URL}/api/whop/auth/callback"
    add_env_var "WHOP_OAUTH_REDIRECT_URI" "$REDIRECT_URI"
    add_env_var "NEXT_PUBLIC_APP_URL" "$PROD_URL"

    echo ""
    echo "✅ Production URLs configured!"
    echo "   App URL: $PROD_URL"
    echo "   Redirect URI: $REDIRECT_URI"
fi

echo ""
echo "🎯 Optional: Would you like to add Supabase variables? (y/N)"
read -p "> " add_supabase

if [[ $add_supabase == [yY] ]]; then
    echo ""
    echo "Adding Supabase configuration..."

    SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d '=' -f2-)
    add_env_var "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"

    SUPABASE_ANON=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local | cut -d '=' -f2-)
    add_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON"

    SUPABASE_SERVICE=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d '=' -f2-)
    add_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE"
fi

echo ""
echo "✅ Environment variables synced to Vercel!"
echo ""
echo "📝 Next Steps:"
echo "=============="
echo "1. Deploy to production: vercel --prod"
echo "2. Update Whop OAuth redirect URI to: ${REDIRECT_URI:-https://your-app.vercel.app/api/whop/auth/callback}"
echo "3. Test OAuth flow on production"
echo ""
