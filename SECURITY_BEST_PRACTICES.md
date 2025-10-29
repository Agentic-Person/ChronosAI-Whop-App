# Security Best Practices - AI Video Learning Assistant

This document provides security guidelines for developers working on the AI Video Learning Assistant platform.

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Multi-Tenant Isolation](#multi-tenant-isolation)
3. [Input Validation](#input-validation)
4. [API Security](#api-security)
5. [Database Security](#database-security)
6. [Secrets Management](#secrets-management)
7. [Logging & Monitoring](#logging--monitoring)
8. [Code Review Checklist](#code-review-checklist)

---

## Authentication & Authorization

### DO

✅ **Always use the authentication middleware** for protected routes:
```typescript
import { withCreatorAuth } from '@/lib/middleware/with-auth';

export const POST = withCreatorAuth(async (req, creator) => {
  // creator.id is guaranteed to be valid here
  const creatorId = creator.id;
  // ... your logic
});
```

✅ **Get creator ID from authenticated session**, never from headers:
```typescript
import { getAuthenticatedCreatorId } from '@/lib/middleware/with-auth';

const creatorId = await getAuthenticatedCreatorId();
```

✅ **Validate resource ownership** before operations:
```typescript
import { validateCreatorOwnership } from '@/lib/middleware/with-auth';

const hasAccess = await validateCreatorOwnership(creatorId, videoId, 'video');
if (!hasAccess) {
  throw new AuthorizationError('You do not have access to this resource');
}
```

### DON'T

❌ **Never accept creator_id from request headers**:
```typescript
// INSECURE - Don't do this!
const creatorId = req.headers.get('x-creator-id');
```

❌ **Never use hardcoded creator IDs**:
```typescript
// INSECURE - Don't do this!
const creatorId = '00000000-0000-0000-0000-000000000001';
```

❌ **Never bypass authentication checks**, even for development:
```typescript
// INSECURE - Don't do this!
// if (!creatorId) {
//   return error;
// }
```

---

## Multi-Tenant Isolation

### DO

✅ **Always filter by creator_id in database queries**:
```typescript
const { data: videos } = await supabase
  .from('videos')
  .select('*')
  .eq('creator_id', creatorId); // REQUIRED
```

✅ **Use RLS (Row Level Security) policies** for all tables:
```sql
CREATE POLICY "Creators can view own videos"
  ON videos FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creators WHERE whop_user_id = auth.uid()
    )
  );
```

✅ **Pass creator_id to all vector search functions**:
```typescript
const results = await searchRelevantChunks(query, {
  creator_id: creatorId, // REQUIRED for multi-tenant isolation
  match_count: 5,
});
```

### DON'T

❌ **Never query without creator_id filtering**:
```typescript
// INSECURE - Don't do this!
const { data: allVideos } = await supabase
  .from('videos')
  .select('*');
// This returns videos from ALL creators!
```

❌ **Never make creator_id optional** in functions:
```typescript
// INSECURE - Don't do this!
function processVideo(videoId: string, creatorId?: string) {
  // creator_id should ALWAYS be required
}
```

---

## Input Validation

### DO

✅ **Validate all user inputs** before processing:
```typescript
import { z } from 'zod';

const ChatMessageSchema = z.object({
  message: z.string().min(1).max(500),
  session_id: z.string().uuid().optional(),
});

const validatedData = ChatMessageSchema.parse(body);
```

✅ **Sanitize HTML/scripts** in user content:
```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitized = DOMPurify.sanitize(userInput, { ALLOWED_TAGS: [] });
```

✅ **Validate file uploads** server-side:
```typescript
// Check file extension
const allowedExtensions = ['.mp4', '.mov', '.avi'];
const ext = path.extname(filename).toLowerCase();
if (!allowedExtensions.includes(ext)) {
  throw new ValidationError('Invalid file type');
}

// Check file size
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
if (fileSize > MAX_FILE_SIZE) {
  throw new ValidationError('File too large');
}
```

### DON'T

❌ **Never trust client-side validation alone**:
```typescript
// INSECURE - Client can bypass this!
// Always validate on server-side
```

❌ **Never use eval() or Function()** with user input:
```typescript
// EXTREMELY INSECURE - Never do this!
eval(userInput);
new Function(userInput)();
```

❌ **Never directly interpolate** user input into SQL:
```typescript
// INSECURE - SQL injection vulnerability!
const query = `SELECT * FROM videos WHERE title = '${userInput}'`;
```

---

## API Security

### DO

✅ **Use rate limiting** on all public endpoints:
```typescript
export const POST = withInfrastructure(
  async (req) => {
    // ... handler logic
  },
  {
    rateLimit: {
      enabled: true,
      endpoint: 'chat:message',
    },
  }
);
```

✅ **Return generic error messages** to clients:
```typescript
// Good - Generic error
return NextResponse.json(
  { error: 'Invalid credentials' },
  { status: 401 }
);

// Bad - Reveals too much
// return NextResponse.json(
//   { error: 'User john@example.com not found in database' },
//   { status: 404 }
// );
```

✅ **Set appropriate HTTP status codes**:
- 401 Unauthorized - Authentication required
- 403 Forbidden - Authenticated but not authorized
- 404 Not Found - Resource doesn't exist
- 429 Too Many Requests - Rate limit exceeded

### DON'T

❌ **Never expose internal errors** to clients:
```typescript
// INSECURE - Don't do this!
catch (error) {
  return NextResponse.json({ error: error.message });
}
```

❌ **Never disable rate limiting** in production:
```typescript
// INSECURE - Don't do this!
if (process.env.NODE_ENV === 'production') {
  // Rate limiting should be ENABLED in production
}
```

---

## Database Security

### DO

✅ **Use parameterized queries** (Supabase handles this automatically):
```typescript
// Safe - Supabase uses parameterized queries
const { data } = await supabase
  .from('videos')
  .select('*')
  .eq('title', userInput);
```

✅ **Enable RLS (Row Level Security)** on all tables:
```sql
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
```

✅ **Use the least privilege principle** for database roles:
- Use `anon` role for unauthenticated access
- Use `authenticated` role for logged-in users
- Reserve `service_role` for backend operations only

### DON'T

❌ **Never use service_role** in client-side code:
```typescript
// INSECURE - service_role bypasses ALL security!
const supabase = createClient(supabaseUrl, serviceRoleKey);
```

❌ **Never grant excessive permissions** in RLS policies:
```sql
-- INSECURE - Too permissive!
CREATE POLICY "Allow all" ON videos FOR ALL USING (true);
```

---

## Secrets Management

### DO

✅ **Store secrets in environment variables**:
```typescript
const apiKey = process.env.ANTHROPIC_API_KEY;
```

✅ **Use different secrets** for each environment:
- Development: `.env.local`
- Staging: Vercel environment variables
- Production: Vercel environment variables (encrypted)

✅ **Rotate secrets regularly**:
- OAuth tokens: Auto-refresh
- API keys: Rotate quarterly
- Webhook secrets: Rotate after security incidents

✅ **Encrypt sensitive data** before storage:
```typescript
const encrypted = TokenEncryption.encrypt(accessToken);
```

### DON'T

❌ **Never commit secrets** to git:
```bash
# Always add to .gitignore
.env
.env.local
.env.*.local
```

❌ **Never log secrets**:
```typescript
// INSECURE - Don't do this!
console.log('API Key:', process.env.OPENAI_API_KEY);
```

❌ **Never expose secrets** in client-side code:
```typescript
// INSECURE - Exposed to browser!
const apiKey = process.env.NEXT_PUBLIC_SECRET_KEY;
// Use NEXT_PUBLIC_ prefix ONLY for non-sensitive config
```

---

## Logging & Monitoring

### DO

✅ **Use structured logging**:
```typescript
import { logInfo, logError, logWarning } from '@/lib/infrastructure/monitoring/logger';

logInfo('User authenticated', {
  userId: user.id, // Safe to log
  action: 'login',
});
```

✅ **Log security events**:
- Authentication failures
- Authorization failures
- Rate limit violations
- Webhook signature failures
- Suspicious activity

✅ **Monitor critical metrics**:
```typescript
import { measureAsync } from '@/lib/infrastructure/monitoring/performance';

const result = await measureAsync('expensive_operation', async () => {
  return await performOperation();
});
```

### DON'T

❌ **Never log sensitive data**:
```typescript
// INSECURE - Don't do this!
console.log('User data:', {
  email: user.email,
  password: user.password, // NEVER log passwords!
  accessToken: token, // NEVER log tokens!
});
```

❌ **Never use console.log** in production code:
```typescript
// Bad practice - Use structured logging instead
console.log('Debug info:', data);
```

❌ **Never log entire error objects**:
```typescript
// INSECURE - May contain sensitive data
console.error('Error:', error);

// Better
logError('Operation failed', error, {
  operation: 'video_upload',
  userId: user.id,
});
```

---

## Code Review Checklist

### Authentication
- [ ] All protected routes use authentication middleware
- [ ] Creator ID is obtained from session, not headers
- [ ] No hardcoded credentials or IDs
- [ ] No authentication bypass code (TODO comments)

### Authorization
- [ ] Resource ownership is validated before operations
- [ ] Multi-tenant isolation enforced (creator_id filtering)
- [ ] RLS policies are in place and tested
- [ ] No cross-tenant data access possible

### Input Validation
- [ ] All user inputs are validated
- [ ] File uploads are validated (type, size, extension)
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities (HTML sanitization)
- [ ] No command injection vulnerabilities

### API Security
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] Error messages are generic
- [ ] Status codes are appropriate

### Secrets
- [ ] No secrets committed to git
- [ ] No secrets in client-side code
- [ ] No secrets logged
- [ ] Environment variables are used

### Logging
- [ ] Structured logging is used
- [ ] No sensitive data logged
- [ ] Security events are logged
- [ ] No console.log in production code

### Testing
- [ ] Security tests are written
- [ ] Multi-tenant isolation is tested
- [ ] Authentication bypass is tested
- [ ] Input validation is tested

---

## Incident Response

### If you discover a security vulnerability:

1. **Do NOT create a public GitHub issue**
2. Email security@mentora.com (or notify security team directly)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

### If a security incident occurs:

1. **Immediately revoke compromised credentials**
2. **Notify security team and management**
3. **Review access logs for unauthorized access**
4. **Document the incident**
5. **Implement fixes**
6. **Conduct post-mortem**

---

## Security Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

## Security Training

All developers should complete:
- [ ] OWASP Top 10 training
- [ ] Secure coding fundamentals
- [ ] Multi-tenant SaaS security
- [ ] Incident response procedures

---

**Last Updated:** October 27, 2025
**Review Frequency:** Quarterly
**Owner:** Security Team
