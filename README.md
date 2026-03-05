# GSC Manager

Automatically syncs your Netlify sites with Google Search Console — adds domains, sets up DNS verification, and tracks status.

**Production:** https://googlesearchconsole.netlify.app/

## Stack

- Vue 3 + TypeScript
- Tailwind CSS 4
- Netlify Functions (serverless backend)
- Google Search Console API + Site Verification API
- Netlify Blobs (token storage)

## Google Cloud

OAuth2 credentials use the **StatPilot** Google Cloud project.

## Smoke Tests

17 tests covering UI and API endpoints.

**UI tests** (`smoke-ui.spec.ts`) — 10 browser tests:
- Dashboard loads with title, nav, stats, refresh button
- Site cards / empty state / error state renders
- Settings page loads with Google Account section + connection status
- Navigation between views (client-side routing)
- Mobile responsive at 375px

**API tests** (`smoke-api.spec.ts`) — 7 HTTP tests:
- `GET /api/auth-status` → 200, boolean
- `GET /api/auth-url` → 200, Google URL
- `GET /api/sites` → 200 with shape validation or 500 with error message
- Method validation (405s for wrong HTTP methods)

```bash
npm run test:smoke        # Run all smoke tests
npm run test:smoke:ui     # UI tests only
npm run test:smoke:api    # API tests only
npm run test:smoke:report # View HTML report
```

## Setup

See [dev.md](dev.md) for local development setup.
