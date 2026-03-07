# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

GSC Manager — a tool that auto-discovers Netlify sites with custom domains and registers/verifies them in Google Search Console via DNS TXT records. Vue 3 frontend + Netlify Functions backend.

## Commands

- `npm run dev` — Start dev server (Vite + Netlify Functions via `@netlify/vite-plugin`)
- `npm run build` — Type-check with `vue-tsc` then Vite build
- `npm run preview` — Preview production build

Do NOT use `netlify dev` — the `@netlify/vite-plugin` handles function emulation.

## Architecture

### Frontend (`src/`)
- **Vue 3 + TypeScript + Tailwind CSS 4** SPA with vue-router
- Two views: `DashboardView` (site grid with sync controls) and `SettingsView` (Google OAuth setup)
- Composables (`useSites`, `useSync`) manage shared reactive state — singleton pattern (state refs declared outside the function)
- Path alias: `@` → `./src`

### Backend (`netlify/functions/`)
API endpoints accessed via `/api/*` redirect (configured in `netlify.toml`):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth-url` | GET | Generate Google OAuth URL |
| `/api/auth-callback` | GET | Exchange OAuth code, auto-store refresh token via Netlify Blobs |
| `/api/auth-status` | GET | Check if Google account is connected |
| `/api/sites` | GET | Merged view of Netlify sites + GSC status |
| `/api/sync-background` | POST | Run sync engine (background function, 15min timeout) |

### Shared Libraries (`netlify/lib/`)
- **google.ts** — Google APIs client (Search Console + Site Verification + OAuth)
- **netlify-api.ts** — Netlify REST API client (sites, DNS zones, DNS records)
- **domain-utils.ts** — Root domain extraction, deduplication, DNS zone matching
- **sync-engine.ts** — Core sync logic: discover → add to GSC → create DNS TXT → verify with retries
- **types.ts** — API response types (separate from frontend types)

### Shared Types
Frontend types in `src/types/index.ts` (`ManagedSite`, `SyncResult`) are imported by both frontend and backend.

## Environment Variables

See `.env.example`. Required:
- `NETLIFY_PAT` — Netlify Personal Access Token
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth2 credentials
- `GOOGLE_REDIRECT_URI` — OAuth callback URL (use `/api/auth-callback` path)
- `GOOGLE_REFRESH_TOKEN` — Optional fallback; normally auto-stored via Netlify Blobs after OAuth

## Deployment

- **Production URL:** https://googlesearchconsole.netlify.app/
- **Netlify site:** googlesearchconsole
- **GitHub repo:** https://github.com/dizid/google-search-console

## Key Concepts

- **Domain property format**: GSC uses `sc-domain:{domain}` format for domain properties
- **DNS verification**: Uses `DNS_TXT` method via Google Site Verification API
- **Sync retries**: Verification retries at 30s, 60s, 120s intervals waiting for DNS propagation
- **Only Netlify-managed DNS**: Sites without Netlify DNS zones are skipped (marked `manual_required`)
