import { getStore } from '@netlify/blobs'

const STORE_NAME = 'google-auth'
const TOKEN_KEY = 'refresh_token'

export async function saveRefreshToken(token: string): Promise<void> {
  const store = getStore(STORE_NAME)
  await store.set(TOKEN_KEY, token)
}

export async function loadRefreshToken(): Promise<string | null> {
  const store = getStore(STORE_NAME)
  return await store.get(TOKEN_KEY)
}
