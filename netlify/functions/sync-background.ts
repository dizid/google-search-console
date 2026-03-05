import type { Context } from '@netlify/functions'
import { runSync } from '../lib/sync-engine.js'

// The "-background" suffix makes this a Netlify Background Function
// with a 15-minute timeout instead of the default 26 seconds.
export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json().catch(() => ({})) as { domains?: string[] }
    const result = await runSync(body.domains)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
