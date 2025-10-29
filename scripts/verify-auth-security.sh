#!/bin/bash

# Security Verification Script
# Checks for authentication bypasses in API routes
# Usage: ./scripts/verify-auth-security.sh

set -e

echo "========================================="
echo "Security Verification Script"
echo "AI Video Learning Assistant"
echo "========================================="
echo ""

FAILED=0

# Change to project root
cd "$(dirname "$0")/.."

echo "Checking for authentication bypasses..."
echo ""

# 1. Check for TODO production removal markers
echo "1. Checking for TODO REMOVE BEFORE PRODUCTION markers..."
COUNT=$(grep -r "TODO.*REMOVE.*BEFORE.*PRODUCTION" app/api/ 2>/dev/null | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "   ❌ FAIL: Found $COUNT TODO markers in production code"
  grep -r "TODO.*REMOVE.*BEFORE.*PRODUCTION" app/api/ 2>/dev/null
  FAILED=1
else
  echo "   ✅ PASS: No TODO markers found"
fi
echo ""

# 2. Check for DEV MODE bypasses
echo "2. Checking for DEV MODE bypasses..."
COUNT=$(grep -r "DEV MODE" app/api/ 2>/dev/null | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "   ❌ FAIL: Found $COUNT DEV MODE bypasses"
  grep -r "DEV MODE" app/api/ 2>/dev/null
  FAILED=1
else
  echo "   ✅ PASS: No DEV MODE bypasses found"
fi
echo ""

# 3. Check for placeholder UUIDs
echo "3. Checking for placeholder UUIDs in API routes..."
COUNT=$(grep -r "00000000-0000-0000-0000-000000000001" app/api/ 2>/dev/null | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "   ❌ FAIL: Found $COUNT placeholder UUID references"
  grep -r "00000000-0000-0000-0000-000000000001" app/api/ 2>/dev/null
  FAILED=1
else
  echo "   ✅ PASS: No placeholder UUIDs found"
fi
echo ""

# 4. Check for unsafe x-creator-id header usage
echo "4. Checking for unsafe x-creator-id header usage..."
COUNT=$(grep -r "req.headers.get('x-creator-id')" app/api/ 2>/dev/null | grep -v "SECURITY: Reject" | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "   ❌ FAIL: Found $COUNT unsafe x-creator-id usages"
  grep -r "req.headers.get('x-creator-id')" app/api/ 2>/dev/null | grep -v "SECURITY: Reject"
  FAILED=1
else
  echo "   ✅ PASS: No unsafe x-creator-id usage found"
fi
echo ""

# 5. Check for Temporary dev bypass comments
echo "5. Checking for 'Temporary dev bypass' comments..."
COUNT=$(grep -r "Temporary dev bypass" app/api/ 2>/dev/null | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "   ❌ FAIL: Found $COUNT temporary bypass comments"
  grep -r "Temporary dev bypass" app/api/ 2>/dev/null
  FAILED=1
else
  echo "   ✅ PASS: No temporary bypass comments found"
fi
echo ""

# 6. Verify authentication imports
echo "6. Checking that protected routes import createClient..."
ROUTES=(
  "app/api/video/upload-url/route.ts"
  "app/api/video/create/route.ts"
  "app/api/upload/session/create/route.ts"
  "app/api/video/youtube-import/route.ts"
  "app/api/creator/stats/route.ts"
  "app/api/courses/route.ts"
  "app/api/video/list/route.ts"
)

for route in "${ROUTES[@]}"; do
  if [ -f "$route" ]; then
    if ! grep -q "import { createClient }" "$route" 2>/dev/null; then
      echo "   ❌ FAIL: $route missing createClient import"
      FAILED=1
    fi
  fi
done

if [ "$FAILED" -eq 0 ]; then
  echo "   ✅ PASS: All protected routes have proper imports"
fi
echo ""

# Summary
echo "========================================="
if [ "$FAILED" -eq 0 ]; then
  echo "✅ ALL SECURITY CHECKS PASSED"
  echo "Application is PRODUCTION READY"
  exit 0
else
  echo "❌ SECURITY CHECKS FAILED"
  echo "Application is NOT production ready"
  echo "Please fix the issues above before deploying"
  exit 1
fi
