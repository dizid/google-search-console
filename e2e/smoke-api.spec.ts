import { test, expect } from '@playwright/test'

test.describe('API: /api/auth-status', () => {
  test('GET returns connected boolean', async ({ request }) => {
    const res = await request.get('/api/auth-status')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('connected')
    expect(typeof body.connected).toBe('boolean')
  })
})

test.describe('API: /api/auth-url', () => {
  test('GET returns Google OAuth URL', async ({ request }) => {
    const res = await request.get('/api/auth-url')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('url')
    expect(typeof body.url).toBe('string')
    expect(body.url).toContain('google.com')
  })

  test('POST returns 405', async ({ request }) => {
    const res = await request.post('/api/auth-url')
    expect(res.status()).toBe(405)
  })
})

test.describe('API: /api/sites', () => {
  test('GET returns valid response', async ({ request }) => {
    const res = await request.get('/api/sites')
    const body = await res.json()

    if (res.status() === 200) {
      // Healthy: validate response shape
      expect(body).toHaveProperty('sites')
      expect(Array.isArray(body.sites)).toBe(true)
      expect(body).toHaveProperty('googleConnected')
      expect(typeof body.googleConnected).toBe('boolean')
    } else {
      // Degraded (e.g. missing env vars): should return error message, not crash
      expect(res.status()).toBe(500)
      expect(body).toHaveProperty('error')
    }
  })

  test('POST returns 405', async ({ request }) => {
    const res = await request.post('/api/sites')
    expect(res.status()).toBe(405)
  })
})

test.describe('API: /api/sync', () => {
  // Intentionally skip POST — it has real side effects (DNS records, GSC modifications)
  test('GET returns 405', async ({ request }) => {
    const res = await request.get('/api/sync')
    expect(res.status()).toBe(405)
  })
})
