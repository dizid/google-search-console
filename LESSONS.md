# Lessons Learned

## 1. SPA Routing Needs a Catch-All Redirect

**Problem:** Direct navigation to `/settings` returned Netlify's "Page not found" — only client-side navigation worked.

**Cause:** `netlify.toml` only had the `/api/*` redirect. Netlify doesn't know about Vue Router routes, so any non-root URL served a 404.

**Fix:** Add a catch-all redirect *after* the API redirect:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Rule:** Every SPA deployed to Netlify needs this. Order matters — specific redirects (like `/api/*`) must come before the catch-all.

---

## 2. Never Hardcode OAuth Redirect URIs

**Problem:** `GOOGLE_REDIRECT_URI` was set to `http://localhost:5174/api/auth-callback` in `.env`. Production runs at `https://googlesearchconsole.netlify.app`, causing `redirect_uri_mismatch` (Error 400) on every OAuth attempt.

**Cause:** The redirect URI was an environment variable that differed between local and production. Easy to forget, impossible to debug without checking the exact URI being sent.

**Fix:** Auto-detect from request headers (NOT `req.url`):
```typescript
export function buildRedirectUri(req: Request): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  return `${proto}://${host}/api/auth-callback`
}
```

**Rule:** Derive OAuth redirect URIs from request headers at runtime. Works in localhost, production, and deploy previews without any config. Still need both URIs registered in Google Cloud Console.

---

## 2b. Netlify Rewrites `req.url` — Use Headers Instead

**Problem:** After fixing the hardcoded redirect URI, OAuth *still* failed with `invalid_request` during the code exchange step.

**Cause:** Netlify's `/api/*` redirect rewrites `req.url` from `/api/auth-callback` to `/.netlify/functions/auth-callback`. So `new URL(req.url).origin` might not match the browser's origin, and the path is definitely wrong. The redirect URI built during `auth-url` (from `/api/auth-url`) and during `auth-callback` (from `/.netlify/functions/auth-callback`) were different — Google rejects mismatched URIs.

**Fix:** Use `x-forwarded-host` and `x-forwarded-proto` headers instead of `req.url`. These headers preserve the original host/protocol the browser used, regardless of internal rewrites.

**Rule:** On Netlify (and most reverse proxies), never trust `req.url` for building external-facing URLs. Always use `x-forwarded-*` headers.

---

## 3. `/api/sites` Returns 500 in Production

**Problem:** The `/api/sites` endpoint returns HTTP 500 in production.

**Likely cause:** Missing or invalid `NETLIFY_TOKEN` env var on the deployed Netlify site. The env var name must be `NETLIFY_TOKEN` everywhere — in `.env`, code, and the Netlify dashboard.

**Rule:** Always verify env var names match between `.env`, code references, and the Netlify dashboard. Add a smoke test that catches this.

---

## 4. Smoke Tests Catch Real Bugs Immediately

**What happened:** First run of smoke tests against production found:
- SPA routing broken (Settings page 404)
- API endpoint returning 500
- OAuth redirect URI mismatch

**Rule:** Add Playwright smoke tests early — they pay for themselves on the first run. Test against production, not just dev.

---

## 5. Smoke Tests Must Handle Degraded State

**Problem:** Initial test for "site cards or empty state" failed because neither showed — the API returned an error, so the *error banner* displayed instead.

**Fix:** Test for all valid states, not just the happy path:
```typescript
const hasCards = await cards.count() > 0
const hasEmpty = await emptyState.isVisible().catch(() => false)
const hasError = await errorBanner.isVisible().catch(() => false)
expect(hasCards || hasEmpty || hasError).toBe(true)
```

**Rule:** Production smoke tests should verify the app *handles* errors gracefully, not assume everything is healthy. A displayed error message is better than a blank screen.

---

## 6. `GOOGLE_REDIRECT_URI` Env Var Is No Longer Needed

After the auto-detect fix, `GOOGLE_REDIRECT_URI` can be removed from:
- `.env` (local)
- Netlify dashboard (production)
- `.env.example` (documentation)

The `getAuth()` function for API calls (Search Console, Site Verification) doesn't need a redirect URI — only the OAuth flow does, and that now auto-detects.
