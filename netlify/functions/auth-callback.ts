import type { Context } from '@netlify/functions'
import { exchangeCode } from '../lib/google.js'

export default async (req: Request, _context: Context) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    return new Response(renderHtml('Auth Error', `<p class="error">Google returned an error: ${error}</p>`), {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  if (!code) {
    return new Response(renderHtml('Auth Error', '<p class="error">No authorization code received.</p>'), {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  try {
    const tokens = await exchangeCode(code)

    const html = renderHtml('Auth Success', `
      <p>Google account connected successfully.</p>
      <p>Copy this refresh token and add it as <code>GOOGLE_REFRESH_TOKEN</code> in your Netlify environment variables:</p>
      <div class="token-box">
        <code id="token">${tokens.refresh_token || 'No refresh token returned — try revoking access at myaccount.google.com/permissions and re-authorizing'}</code>
        <button onclick="navigator.clipboard.writeText(document.getElementById('token').textContent)">Copy</button>
      </div>
      <p><a href="/settings">Back to Settings</a></p>
    `)

    return new Response(html, { headers: { 'Content-Type': 'text/html' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(renderHtml('Auth Error', `<p class="error">Failed to exchange code: ${message}</p>`), {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

function renderHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { font-family: system-ui; background: #0f172a; color: #f8fafc; max-width: 600px; margin: 2rem auto; padding: 0 1rem; }
  code { background: #1e293b; padding: 2px 6px; border-radius: 4px; }
  .token-box { background: #1e293b; padding: 1rem; border-radius: 8px; margin: 1rem 0; word-break: break-all; display: flex; gap: 0.5rem; align-items: start; }
  .token-box code { background: none; flex: 1; }
  .token-box button { background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; white-space: nowrap; }
  .error { color: #ef4444; }
  a { color: #3b82f6; }
</style>
</head><body><h1>${title}</h1>${body}</body></html>`
}
