import { ref } from 'vue'
import type { SyncResult } from '../types'

const syncing = ref(false)
const syncResult = ref<SyncResult | null>(null)
const syncError = ref<string | null>(null)

export function useSync() {
  async function syncAll() {
    syncing.value = true
    syncResult.value = null
    syncError.value = null
    try {
      const res = await fetch('/api/sync-background', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      syncResult.value = data
    } catch (err) {
      syncError.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      syncing.value = false
    }
  }

  async function syncDomains(domains: string[]) {
    syncing.value = true
    syncResult.value = null
    syncError.value = null
    try {
      const res = await fetch('/api/sync-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      syncResult.value = data
    } catch (err) {
      syncError.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      syncing.value = false
    }
  }

  return { syncing, syncResult, syncError, syncAll, syncDomains }
}
