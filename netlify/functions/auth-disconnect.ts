import '../lib/env.js'
import type { Context } from '@netlify/functions'
import { deleteRefreshToken } from '../lib/token-store.js'

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  await deleteRefreshToken()
  return Response.json({ disconnected: true })
}
