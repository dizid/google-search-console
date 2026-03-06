import { ref } from 'vue'
import type { ManagedSite } from '../types'

const sites = ref<ManagedSite[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const googleConnected = ref(false)
const googleError = ref<string | null>(null)
const isAuthError = ref(false)

export function useSites() {
  async function fetchSites() {
    loading.value = true
    error.value = null
    googleError.value = null
    isAuthError.value = false
    try {
      const res = await fetch('/api/sites')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch sites')
      sites.value = data.sites
      googleConnected.value = data.googleConnected ?? false
      googleError.value = data.googleError ?? null
      // Detect auth-specific errors for targeted reconnect prompt
      if (data.googleError) {
        const errLower = data.googleError.toLowerCase()
        isAuthError.value = errLower.includes('invalid_grant')
          || errLower.includes('revoked')
          || errLower.includes('refresh token')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return { sites, loading, error, googleConnected, googleError, isAuthError, fetchSites }
}
