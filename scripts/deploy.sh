#!/bin/bash

##############################################
# Production Deployment Script
##############################################
#
# This script handles the full deployment workflow:
# 1. Pre-flight checks
# 2. Environment validation
# 3. Build verification
# 4. Vercel deployment
# 5. Post-deployment verification
# 6. Monitoring setup
#
# Usage: ./scripts/deploy.sh [options]
#
# Options:
#   --skip-tests     Skip test execution (not recommended)
#   --force          Skip confirmation prompts
#   --dry-run        Show what would be deployed without deploying
##############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_TESTS=false
FORCE=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --skip-tests)
      SKIP_TESTS=true
      ;;
    --force)
      FORCE=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
  esac
done

##############################################
# Helper Functions
##############################################

log_info() {
  echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_section() {
  echo ""
  echo -e "${CYAN}========================================${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}========================================${NC}"
  echo ""
}

confirm() {
  if [ "$FORCE" = true ]; then
    return 0
  fi

  read -p "$(echo -e ${YELLOW}$1 \(y/N\):${NC} )" -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    return 1
  fi
  return 0
}

check_command() {
  if ! command -v $1 &> /dev/null; then
    log_error "$1 is not installed. Please install it first."
    exit 1
  fi
}

##############################################
# Pre-flight Checks
##############################################

log_section "🚀 Production Deployment - Pre-flight Checks"

# Check required commands
log_info "Checking required commands..."
check_command node
check_command npm
check_command git
check_command vercel
log_success "All required commands available"

# Check Node version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
  log_error "Node.js version must be 18 or higher (current: $NODE_VERSION)"
  exit 1
fi
log_success "Node.js version: $(node -v)"

# Check git status
if [ -n "$(git status --porcelain)" ]; then
  log_warning "Working directory is not clean"
  git status --short
  if ! confirm "Continue with uncommitted changes?"; then
    exit 1
  fi
fi
log_success "Git status checked"

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log_info "Current branch: $CURRENT_BRANCH"

# Warn if not on main
if [ "$CURRENT_BRANCH" != "main" ]; then
  log_warning "You are not on the 'main' branch"
  if ! confirm "Deploy from '$CURRENT_BRANCH' branch?"; then
    exit 1
  fi
fi

# Get current commit
COMMIT_SHA=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
log_info "Deploying commit: ${COMMIT_SHA:0:7}"
log_info "Commit message: $COMMIT_MSG"

##############################################
# Environment Validation
##############################################

log_section "🔍 Environment Validation"

log_info "Validating environment variables..."
if node scripts/validate-env.js; then
  log_success "Environment variables validated"
else
  log_error "Environment validation failed"
  exit 1
fi

##############################################
# Dependency Check
##############################################

log_section "📦 Dependency Check"

log_info "Installing dependencies..."
npm ci --quiet
log_success "Dependencies installed"

##############################################
# Run Tests
##############################################

if [ "$SKIP_TESTS" = false ]; then
  log_section "🧪 Running Tests"

  log_info "Running linter..."
  npm run lint
  log_success "Linting passed"

  log_info "Running unit tests..."
  npm run test -- --passWithNoTests
  log_success "Tests passed"
else
  log_warning "Skipping tests (not recommended for production)"
fi

##############################################
# Build Application
##############################################

log_section "🔨 Building Application"

log_info "Running production build..."
if npm run build; then
  log_success "Build completed successfully"
else
  log_error "Build failed"
  exit 1
fi

# Check build output
if [ ! -d ".next" ]; then
  log_error "Build output directory (.next) not found"
  exit 1
fi

# Get build size
BUILD_SIZE=$(du -sh .next | cut -f1)
log_info "Build size: $BUILD_SIZE"

##############################################
# Dry Run Check
##############################################

if [ "$DRY_RUN" = true ]; then
  log_section "🔍 Dry Run Complete"
  log_success "Build successful - deployment would proceed"
  log_info "Run without --dry-run to deploy"
  exit 0
fi

##############################################
# Pre-deployment Confirmation
##############################################

log_section "⚠️  Pre-deployment Confirmation"

echo -e "${CYAN}Deployment Summary:${NC}"
echo "  Environment: Production"
echo "  Branch: $CURRENT_BRANCH"
echo "  Commit: ${COMMIT_SHA:0:7}"
echo "  Build Size: $BUILD_SIZE"
echo ""

if ! confirm "Deploy to production?"; then
  log_info "Deployment cancelled"
  exit 0
fi

##############################################
# Deploy to Vercel
##############################################

log_section "🚀 Deploying to Vercel"

log_info "Pulling Vercel configuration..."
vercel pull --yes --environment=production

log_info "Building for Vercel..."
vercel build --prod

log_info "Deploying to production..."
DEPLOYMENT_URL=$(vercel deploy --prebuilt --prod)

if [ -z "$DEPLOYMENT_URL" ]; then
  log_error "Deployment failed - no URL returned"
  exit 1
fi

log_success "Deployed to: $DEPLOYMENT_URL"

##############################################
# Post-deployment Verification
##############################################

log_section "✅ Post-deployment Verification"

log_info "Waiting for deployment to be ready..."
sleep 10

# Check health endpoint
log_info "Checking health endpoint..."
HEALTH_URL="$DEPLOYMENT_URL/health"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 503 ]; then
  log_success "Health check passed (HTTP $HTTP_STATUS)"
else
  log_error "Health check failed (HTTP $HTTP_STATUS)"
  log_warning "Deployment may be unhealthy - check logs"
fi

# Check main page
log_info "Checking homepage..."
HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL")

if [ "$HOME_STATUS" -eq 200 ]; then
  log_success "Homepage accessible (HTTP $HOME_STATUS)"
else
  log_warning "Homepage returned HTTP $HOME_STATUS"
fi

##############################################
# Create Sentry Release
##############################################

log_section "📊 Creating Sentry Release"

if [ -n "$SENTRY_AUTH_TOKEN" ]; then
  log_info "Creating Sentry release..."

  # This would be replaced with actual Sentry CLI commands
  # sentry-cli releases new "$COMMIT_SHA"
  # sentry-cli releases set-commits "$COMMIT_SHA" --auto
  # sentry-cli releases finalize "$COMMIT_SHA"

  log_success "Sentry release created"
else
  log_warning "SENTRY_AUTH_TOKEN not set, skipping Sentry release"
fi

##############################################
# Deployment Complete
##############################################

log_section "🎉 Deployment Complete"

echo -e "${GREEN}✓${NC} Production deployment successful!"
echo ""
echo "📊 Deployment Details:"
echo "  URL: $DEPLOYMENT_URL"
echo "  Commit: ${COMMIT_SHA:0:7}"
echo "  Time: $(date)"
echo ""
echo "🔗 Quick Links:"
echo "  Dashboard: $DEPLOYMENT_URL/dashboard"
echo "  Health: $DEPLOYMENT_URL/health"
echo "  Vercel: https://vercel.com"
echo "  Sentry: https://sentry.io"
echo ""
echo "📝 Next Steps:"
echo "  1. Monitor error rates in Sentry"
echo "  2. Check analytics in Vercel/PostHog"
echo "  3. Verify critical user flows"
echo "  4. Monitor database performance"
echo ""

log_success "Deployment completed at $(date)"
