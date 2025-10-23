# Testing Infrastructure Documentation

## Overview

This document describes the comprehensive testing infrastructure for the Whop MVP integration. The testing suite includes:

- **Manual Testing Guide** - Step-by-step procedures for testing all features
- **Unit Tests** - Tests for individual components and functions
- **Integration Tests** - Tests for API endpoints and multi-tenant isolation
- **Test Data Setup** - Scripts to populate test database with realistic data

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env.local` with required test variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Whop
WHOP_API_KEY=your_api_key
WHOP_CLIENT_ID=your_client_id
WHOP_CLIENT_SECRET=your_client_secret
WHOP_WEBHOOK_SECRET=your_webhook_secret
WHOP_TOKEN_ENCRYPTION_KEY=generate_with_openssl_rand_hex_32
```

### 3. Setup Test Database

```bash
# Apply migrations
npm run db:migrate

# Populate with test data
tsx scripts/setup-test-data.ts
```

### 4. Run Tests

```bash
# Run all unit tests
npm test

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- lib/whop/mcp/__tests__/client.test.ts

# Generate coverage report
npm test -- --coverage
```

---

## Test Structure

### Manual Testing Guide

**File:** `WHOP_TESTING_GUIDE.md`

Comprehensive manual testing procedures covering:
- OAuth flow testing (authorization, callback, token refresh)
- Webhook testing (signature verification, idempotency, event handling)
- Multi-tenant isolation testing (creator/student data isolation)
- MCP server connectivity testing
- Creator dashboard testing
- Security testing (SQL injection, XSS, CSRF)
- Performance testing

**Usage:**
```bash
# Open the guide
cat WHOP_TESTING_GUIDE.md

# Or view in browser
code WHOP_TESTING_GUIDE.md
```

### Unit Tests

#### MCP Client Tests

**File:** `lib/whop/mcp/__tests__/client.test.ts`

Tests for Whop MCP client wrapper:
- ✅ Company info fetching
- ✅ Product and membership management
- ✅ User operations
- ✅ Helper functions (mapPlanToTier, isMembershipActive)
- ✅ Error handling and connection management
- ✅ Type safety

**Run:**
```bash
npm test -- lib/whop/mcp/__tests__/client.test.ts
```

#### Middleware Validation Tests

**File:** `lib/whop/middleware/__tests__/validate-membership.test.ts`

Tests for membership validation middleware:
- ✅ Session validation
- ✅ Creator vs student authentication
- ✅ Tier-based authorization
- ✅ Multi-tenant isolation
- ✅ Membership status updates

**Run:**
```bash
npm test -- lib/whop/middleware/__tests__/validate-membership.test.ts
```

#### Webhook Handler Tests

**File:** `app/api/webhooks/whop/__tests__/route.test.ts`

Tests for webhook endpoint:
- ✅ Signature verification
- ✅ Timestamp validation (replay attack prevention)
- ✅ Idempotency (duplicate webhook handling)
- ✅ Event processing (membership created/expired, payments)
- ✅ Error handling
- ✅ Security (timing-safe comparison)

**Run:**
```bash
npm test -- app/api/webhooks/whop/__tests__/route.test.ts
```

---

## Test Data Setup Script

**File:** `scripts/setup-test-data.ts`

Creates realistic test data for development and testing:

### Test Data Includes:

#### Creators (3)
- **Creator A**: Alpha Trading Academy (PRO tier)
- **Creator B**: Beta Fitness Coaching (BASIC tier)
- **Creator C**: Gamma Real Estate Mastery (ENTERPRISE tier)

#### Students (3)
- 2 students for Creator A
- 1 student for Creator B

#### Videos (3)
- 2 videos for Creator A (trading content)
- 1 video for Creator B (fitness content)

#### Additional Data
- Video chunks with mock embeddings
- Learning progress records
- Chat sessions and messages
- Quizzes and quiz attempts

### Usage:

```bash
# Setup test data
tsx scripts/setup-test-data.ts

# Clear existing test data first, then setup
tsx scripts/setup-test-data.ts --clear
```

### Test Credentials:

```
Creator A (PRO):
  Email: creator.a@test.com
  Whop User ID: whop_creator_a_123

Creator B (BASIC):
  Email: creator.b@test.com
  Whop User ID: whop_creator_b_234

Student A1:
  Email: student.a1@test.com
  Creator: Alpha Trading Academy
```

---

## Testing Workflows

### Testing OAuth Flow

1. Follow manual testing guide: `WHOP_TESTING_GUIDE.md` → OAuth Flow Testing
2. Use test creator credentials
3. Verify token encryption in database
4. Test token refresh mechanism

### Testing Webhooks

#### Local Testing with curl:

```bash
# Generate signature
PAYLOAD='{"id":"evt_test","type":"membership.created","data":{"id":"mem_123"}}'
TIMESTAMP=$(date +%s)
SIGNATURE=$(echo -n "${TIMESTAMP}.${PAYLOAD}" | openssl dgst -sha256 -hmac "test-webhook-secret" | awk '{print $2}')

# Send webhook
curl -X POST http://localhost:3000/api/webhooks/whop \
  -H "Content-Type: application/json" \
  -H "X-Whop-Signature: $SIGNATURE" \
  -H "X-Whop-Timestamp: $TIMESTAMP" \
  -d "$PAYLOAD"
```

#### Testing with Whop Dashboard:

1. Go to https://dash.whop.com
2. Settings → Developers → Webhooks
3. Add webhook endpoint: `https://your-domain.vercel.app/api/webhooks/whop`
4. Send test event: `membership.created`

### Testing Multi-Tenant Isolation

```bash
# Run isolation tests
npm test -- lib/whop/middleware/__tests__/validate-membership.test.ts

# Manual verification
# 1. Login as Creator A
# 2. Upload video
# 3. Logout and login as Creator B
# 4. Verify Creator B cannot access Creator A's video
```

### Testing MCP Server

```bash
# Check MCP server is running
ps aux | grep mcp

# Test MCP connection
tsx scripts/test-mcp-tools.ts

# Run MCP client tests
npm test -- lib/whop/mcp/__tests__/client.test.ts
```

---

## Test Coverage

### Coverage Goals:
- Unit tests: > 80% coverage
- Integration tests: All critical paths
- Manual tests: All user-facing features

### Generate Coverage Report:

```bash
npm test -- --coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Coverage by Module:

| Module | Coverage Target | Status |
|--------|----------------|---------|
| MCP Client | 80% | ✅ |
| Middleware | 85% | ✅ |
| Webhooks | 90% | ✅ |
| API Routes | 75% | 🔄 In Progress |
| UI Components | 70% | 🔄 In Progress |

---

## Continuous Integration

### GitHub Actions (Future)

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:integration
```

---

## Troubleshooting

### Tests Failing?

#### 1. Environment Variables Not Set
```bash
# Verify variables are loaded
echo $WHOP_API_KEY
echo $SUPABASE_SERVICE_ROLE_KEY

# If missing, source .env.local
export $(cat .env.local | xargs)
```

#### 2. Database Connection Errors
```bash
# Test database connection
curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/

# Check service role key has correct permissions
```

#### 3. MCP Server Not Running
```bash
# Check MCP server process
ps aux | grep mcp

# Restart MCP server
pkill -f mcp
npm run mcp:start
```

#### 4. Jest Configuration Issues
```bash
# Clear Jest cache
npx jest --clearCache

# Run with verbose output
npm test -- --verbose
```

### Common Issues:

| Issue | Solution |
|-------|----------|
| Module not found | Run `npm install` |
| Timeout errors | Increase Jest timeout in jest.config.js |
| Mock errors | Clear node_modules/.cache |
| Database errors | Verify migrations are applied |

---

## Best Practices

### Writing Tests

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use Descriptive Names**: Test names should explain what is being tested
3. **Mock External Dependencies**: Use jest.mock for API calls
4. **Test Edge Cases**: Not just happy path
5. **Keep Tests Isolated**: Each test should be independent

### Example Test Structure:

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  describe('Specific Function', () => {
    it('should handle success case', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle error case', () => {
      // Test error handling
    });
  });
});
```

### Manual Testing Checklist

Before deploying:
- [ ] OAuth flow works end-to-end
- [ ] Webhooks are verified and processed
- [ ] Multi-tenant isolation confirmed
- [ ] No cross-tenant data leakage
- [ ] Security tests pass
- [ ] Performance benchmarks met

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Whop API Docs](https://docs.whop.com)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review test output for specific errors
3. Consult WHOP_TESTING_GUIDE.md for manual testing procedures
4. Contact development team

---

**Last Updated:** 2025-10-23
**Version:** 1.0.0
**Maintainer:** Agent 14 (Whop Integration Specialist)
