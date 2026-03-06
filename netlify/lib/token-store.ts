import { getStore } from '@netlify/blobs'

const STORE_NAME = 'google-auth'
const TOKEN_KEY = 'refresh_token'

export async function saveRefreshToken(token: string): Promise<void> {
  try {
    const store = getStore(STORE_NAME)
    await store.set(TOKEN_KEY, token)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to save token to Netlify Blobs: ${msg}`)
  }
}

export async function loadRefreshToken(): Promise<string | null> {
  try {
    const store = getStore(STORE_NAME)
    return await store.get(TOKEN_KEY)
  } catch {
    return null
  }
}

export async function deleteRefreshToken(): Promise<void> {
  try {
    const store = getStore(STORE_NAME)
    await store.delete(TOKEN_KEY)
  } catch {
    // Silently ignore — delete is best-effort
  }
}
