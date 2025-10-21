# Module 7: Whop Integration

**Status:** Full Implementation Required
**Agent:** Agent 7

## Responsibilities
- OAuth authentication flow
- Webhook handlers with signature verification
- Membership validation middleware
- Tier-based access control
- iFrame embedding support
- Payment event processing

### Webhook Events
- `membership.created` → Provision access
- `membership.expired` → Revoke access
- `payment.succeeded` → Log analytics

## Key Files
- `auth.ts` - OAuth and session management
- `webhooks.ts` - Webhook signature verification
- `membership.ts` - Membership validation
- `middleware.ts` - Auth middleware for routes

## Dependencies
- Whop API (manual SDK implementation)
- Next.js middleware
- JWT for tokens

## API Endpoints
- `GET /api/whop/auth` - OAuth callback
- `POST /api/whop/webhooks` - Webhook handler
- `GET /api/whop/verify` - Verify membership

## Environment Variables
```
WHOP_API_KEY
WHOP_CLIENT_ID
WHOP_CLIENT_SECRET
WHOP_WEBHOOK_SECRET
```

## Testing
- OAuth flow tests
- Webhook signature validation tests
- Membership check tests
- Access control tests
