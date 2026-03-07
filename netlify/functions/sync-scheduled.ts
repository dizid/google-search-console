import type { Config } from '@netlify/functions'

// Weekly scheduled function that triggers the background sync.
// Uses the background function (15-min timeout) because runSync()
// needs minutes for DNS verification retries.
export default async () => {
  const baseUrl = process.env.URL || 'http://localhost:8888'
  const res = await fetch(`${baseUrl}/api/sync-background`, { method: 'POST' })
  console.log('Scheduled sync triggered, status:', res.status)
  return new Response('Sync triggered')
}

export const config: Config = {
  schedule: '@weekly'
}
