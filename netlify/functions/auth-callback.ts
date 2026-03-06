import '../lib/env.js'
import type { Context } from '@netlify/functions'
import { exchangeCode, buildRedirectUri } from '../lib/google.js'
import { saveRefreshToken } from '../lib/token-store.js'

export default async (req: Request, _context: Context) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    return new Response(renderHtml('Auth Error', `<p class="error">Google returned an error: ${escapeHtml(error)}</p>`), {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  if (!code) {
    return new Response(renderHtml('Auth Error', '<p class="error">No authorization code received.</p>'), {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  try {
    const redirectUri = buildRedirectUri(req)
    const tokens = await exchangeCode(code, redirectUri)

    if (!tokens.refresh_token) {
      return new Response(
        renderHtml('Auth Error', `
          <p class="error">No refresh token returned.</p>
          <p>Revoke access at <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a> and try again.</p>
        `),
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Store token — separate try/catch so we give accurate error messages
    try {
      await saveRefreshToken(tokens.refresh_token)
    } catch (saveErr) {
      const msg = saveErr instanceof Error ? saveErr.message : 'Unknown error'
      return new Response(
        renderHtml('Token Save Failed', `
          <p class="error">Google authorized successfully, but we couldn't save the token.</p>
          <p>${escapeHtml(msg)}</p>
          <p>Try again or set <code>GOOGLE_REFRESH_TOKEN</code> manually in Netlify environment variables.</p>
        `),
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Redirect back to settings with success flag
    return new Response(null, {
      status: 302,
      headers: { Location: '/settings?connected=true' }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(renderHtml('Auth Error', `<p class="error">Failed to exchange code: ${escapeHtml(message)}</p>`), {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { font-family: system-ui; background: #0f172a; color: #f8fafc; max-width: 600px; margin: 2rem auto; padding: 0 1rem; }
  code { background: #1e293b; padding: 2px 6px; border-radius: 4px; }
  .error { color: #ef4444; }
  a { color: #3b82f6; }
</style>
</head><body><h1>${title}</h1>${body}<p><a href="/settings">Back to Settings</a></p></body></html>`
}
