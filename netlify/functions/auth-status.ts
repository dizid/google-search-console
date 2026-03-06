import '../lib/env.js'
import type { Context } from '@netlify/functions'
import { validateToken } from '../lib/google.js'

export default async (_req: Request, _context: Context) => {
  const { valid, error } = await validateToken()
  return Response.json({
    connected: valid,
    error: valid ? undefined : error
  })
}
