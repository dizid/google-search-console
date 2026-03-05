import '../lib/env.js'
import type { Context } from '@netlify/functions'
import { getAuthUrl } from '../lib/google.js'

export default async (req: Request, _context: Context) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = getAuthUrl()
  return Response.json({ url })
}
