import '../lib/env.js'
import type { Context } from '@netlify/functions'
import { getAuthUrl, buildRedirectUri } from '../lib/google.js'

export default async (req: Request, _context: Context) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const redirectUri = buildRedirectUri(req.url)
  const url = getAuthUrl(redirectUri)
  return Response.json({ url })
}
