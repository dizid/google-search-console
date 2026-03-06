import '../lib/env.js'
import type { Context } from '@netlify/functions'
import { getAuthUrl, buildRedirectUri } from '../lib/google.js'

export default async (req: Request, _context: Context) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return Response.json({ error: 'Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' }, { status: 500 })
  }

  const redirectUri = buildRedirectUri(req)
  const url = getAuthUrl(redirectUri)
  return Response.json({ url })
}
