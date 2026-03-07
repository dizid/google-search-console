import { ref } from 'vue'

const syncing = ref(false)
const syncStarted = ref(false)
const syncError = ref<string | null>(null)

export function useSync() {
  // Background function returns 202 immediately — no result body
  async function syncAll() {
    syncing.value = true
    syncStarted.value = false
    syncError.value = null
    try {
      const res = await fetch('/api/sync-background', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Sync failed (${res.status})`)
      }
      syncStarted.value = true
    } catch (err) {
      syncError.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      syncing.value = false
    }
  }

  async function syncDomains(domains: string[]) {
    syncing.value = true
    syncStarted.value = false
    syncError.value = null
    try {
      const res = await fetch('/api/sync-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Sync failed (${res.status})`)
      }
      syncStarted.value = true
    } catch (err) {
      syncError.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      syncing.value = false
    }
  }

  return { syncing, syncStarted, syncError, syncAll, syncDomains }
}
