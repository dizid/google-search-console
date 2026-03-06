import { ref } from 'vue'
import type { ManagedSite } from '../types'

const sites = ref<ManagedSite[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const googleConnected = ref(false)
const googleError = ref<string | null>(null)

export function useSites() {
  async function fetchSites() {
    loading.value = true
    error.value = null
    googleError.value = null
    try {
      const res = await fetch('/api/sites')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch sites')
      sites.value = data.sites
      googleConnected.value = data.googleConnected ?? false
      googleError.value = data.googleError ?? null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return { sites, loading, error, googleConnected, googleError, fetchSites }
}
