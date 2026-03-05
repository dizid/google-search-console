import '../lib/env.js'
import type { Context } from '@netlify/functions'
import { loadRefreshToken } from '../lib/token-store.js'

export default async (_req: Request, _context: Context) => {
  const token = await loadRefreshToken()
  const connected = !!(token ?? process.env.GOOGLE_REFRESH_TOKEN)
  return Response.json({ connected })
}
