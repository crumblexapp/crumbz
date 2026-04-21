# Security Fixes Applied

## Completed Fixes

### 1. Dependency Vulnerabilities (DONE)
- Updated Next.js: `16.1.6` → `16.2.4` (patched 5 vulnerabilities)
- Ran `npm audit fix` - resolved all 6 vulnerable transitive dependencies
- **Status: 0 vulnerabilities remaining**

### 2. File Upload Hardening (DONE)
**File:** `app/api/upload/route.ts`

Added protections:
- 10MB per-file size limit
- 50MB total request limit
- Strict MIME type allowlist (only specific image/video types)
- Clear error messages

### 3. Security Headers (DONE)
**File:** `next.config.ts`

Added headers:
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer info
- `Permissions-Policy` - Disables camera, mic, geolocation, interest-cohort
- `Content-Security-Policy` - Restricts resource loading to trusted origins

### 4. Row Level Security (DONE)
**File:** `supabase/migrations/001_enable_rls.sql`

RLS policies added:
- `app_state`: Read-only for authenticated users, write protected to service_role only
- `places`: Public read, service_role write only
- `place_reviews`: Public read, service_role write only
- `push_subscriptions`: Users can only manage their own subscriptions

### 5. Rate Limiting (DONE - Needs Deployment)
**Files:** 
- `lib/rate-limit.ts` (new)
- `supabase/migrations/002_rate_limits.sql` (new)
- Updated: `app/api/account/route.ts`, `app/api/state/route.ts`, `app/api/upload/route.ts`, `app/api/translate-post/route.ts`

Rate limits applied:
| Endpoint | Limit | Purpose |
|----------|-------|---------|
| Friend actions | 10/min | Prevent friend request spam |
| Posts | 20/min | Prevent post flooding |
| Interactions (comments/likes) | 30/min | Prevent spam engagement |
| Translation | 10/min | Prevent OpenAI quota drain |
| Upload | 10/min | Prevent storage abuse |

---

## ACTION REQUIRED: Deploy Rate Limiting

Run the migration in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/002_rate_limits.sql`
3. Paste and run

**OR** run via Supabase CLI:
```bash
supabase db push
```

---

## Security Checklist

- [x] Zero npm vulnerabilities
- [x] File upload limits enforced
- [x] Security headers configured
- [x] RLS policies deployed to Supabase
- [ ] Rate limiting table deployed to Supabase
- [x] API keys rotated
- [x] `.env.local` confirmed in `.gitignore`

---

## Remaining Recommendations

### Medium Priority
1. **Add Error Boundaries** - Prevent full app crashes from component errors
2. **Split `app/page.tsx`** - 613KB file is unmaintainable

### Low Priority
3. **Add Tests** - Start with critical paths (auth, friend requests, posts)
4. **Admin Config Table** - Move admin emails to database instead of hardcoded
