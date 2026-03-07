# GSC Manager — Dev Setup

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Where to get it |
|----------|----------------|
| `NETLIFY_PAT` | [app.netlify.com/user/applications](https://app.netlify.com/user/applications#personal-access-tokens) — Personal Access Token |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials → OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Same as above |
| `GOOGLE_REDIRECT_URI` | `http://localhost:5173/api/auth-callback` (local) or `https://your-site.netlify.app/api/auth-callback` (prod) |

`GOOGLE_REFRESH_TOKEN` is no longer needed in `.env` — it's stored automatically via Netlify Blobs after connecting your Google account in the app.

## Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable the **Google Search Console API** and **Google Site Verification API**
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: **Web application**
6. Add authorized redirect URI: `http://localhost:5173/api/auth-callback`
7. Copy Client ID and Client Secret to your `.env`

## Running Locally

```bash
npm install
npm run dev
```

Then go to Settings and click "Connect Google Account" to complete the OAuth flow.
