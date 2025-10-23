#!/bin/bash
# Vercel Deployment Script for ChronosAI Platform
# This script helps deploy the application to Vercel with proper configuration

set -e  # Exit on error

echo "🚀 ChronosAI Platform - Vercel Deployment Script"
echo "================================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found!"
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
    echo "✅ Vercel CLI installed"
fi

# Check if user is logged in to Vercel
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel"
    echo "🔑 Please login to Vercel..."
    vercel login
else
    echo "✅ Logged in to Vercel as: $(vercel whoami)"
fi

echo ""
echo "📋 Deployment Options:"
echo "1. Deploy to Preview (development)"
echo "2. Deploy to Production"
echo "3. Configure Environment Variables Only"
echo "4. Exit"
echo ""
read -p "Select option (1-4): " option

case $option in
    1)
        echo ""
        echo "🔨 Deploying to Preview environment..."
        vercel
        echo ""
        echo "✅ Preview deployment complete!"
        echo "🌐 Your preview URL will be shown above"
        ;;
    2)
        echo ""
        echo "⚠️  Deploying to PRODUCTION..."
        read -p "Are you sure? (y/N): " confirm
        if [[ $confirm == [yY] ]]; then
            vercel --prod
            echo ""
            echo "✅ Production deployment complete!"
            echo "🌐 Your production URL will be shown above"
            echo ""
            echo "📝 Don't forget to:"
            echo "   1. Update Whop OAuth redirect URI in Whop Developer Dashboard"
            echo "   2. Test the OAuth flow on production"
        else
            echo "❌ Production deployment cancelled"
        fi
        ;;
    3)
        echo ""
        echo "⚙️  Environment Variable Configuration"
        echo "======================================"
        echo ""
        echo "Required environment variables for OAuth:"
        echo ""
        echo "WHOP_API_KEY"
        echo "NEXT_PUBLIC_WHOP_APP_ID"
        echo "WHOP_CLIENT_ID"
        echo "WHOP_CLIENT_SECRET"
        echo "WHOP_TOKEN_ENCRYPTION_KEY"
        echo "WHOP_OAUTH_REDIRECT_URI"
        echo "NEXT_PUBLIC_APP_URL"
        echo ""
        echo "You can add these via:"
        echo "1. Vercel Dashboard: https://vercel.com/dashboard → Settings → Environment Variables"
        echo "2. Vercel CLI: vercel env add VARIABLE_NAME"
        echo ""
        read -p "Would you like to use the CLI to add variables? (y/N): " use_cli
        if [[ $use_cli == [yY] ]]; then
            echo ""
            echo "Adding WHOP_API_KEY..."
            vercel env add WHOP_API_KEY production
            echo ""
            echo "Adding NEXT_PUBLIC_WHOP_APP_ID..."
            vercel env add NEXT_PUBLIC_WHOP_APP_ID production
            echo ""
            echo "Adding WHOP_CLIENT_ID..."
            vercel env add WHOP_CLIENT_ID production
            echo ""
            echo "Adding WHOP_CLIENT_SECRET..."
            vercel env add WHOP_CLIENT_SECRET production
            echo ""
            echo "Adding WHOP_TOKEN_ENCRYPTION_KEY..."
            vercel env add WHOP_TOKEN_ENCRYPTION_KEY production
            echo ""
            echo "Adding WHOP_OAUTH_REDIRECT_URI..."
            echo "💡 This should be: https://your-domain.vercel.app/api/whop/auth/callback"
            vercel env add WHOP_OAUTH_REDIRECT_URI production
            echo ""
            echo "Adding NEXT_PUBLIC_APP_URL..."
            echo "💡 This should be: https://your-domain.vercel.app"
            vercel env add NEXT_PUBLIC_APP_URL production
            echo ""
            echo "✅ Environment variables configured!"
            echo "🔄 Redeploy to apply changes: vercel --prod"
        fi
        ;;
    4)
        echo "👋 Exiting..."
        exit 0
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "📚 Next Steps:"
echo "=============="
echo ""
echo "1. 🔐 Update Whop OAuth Settings:"
echo "   - Visit: https://dev.whop.com"
echo "   - Add redirect URI: https://your-production-url.vercel.app/api/whop/auth/callback"
echo ""
echo "2. 🧪 Test OAuth Flow:"
echo "   - Visit your production URL"
echo "   - Click 'Login with Whop'"
echo "   - Verify successful authentication and dashboard redirect"
echo ""
echo "3. 📊 Monitor Deployment:"
echo "   - Visit: https://vercel.com/dashboard"
echo "   - Check deployment logs and runtime logs"
echo ""
echo "✨ Deployment process complete!"
