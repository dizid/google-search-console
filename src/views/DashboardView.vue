<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSites } from '../composables/useSites'
import { useSync } from '../composables/useSync'
import SiteCard from '../components/SiteCard.vue'
import SetupPanel from '../components/SetupPanel.vue'
import ToastNotification from '../components/ToastNotification.vue'

const route = useRoute()
const { sites, loading, error, googleConnected, googleError, isAuthError, fetchSites } = useSites()
const { syncing, syncStarted, syncError, syncAll } = useSync()

type Filter = 'all' | 'pending' | 'verified' | 'manual'
const activeFilter = ref<Filter>('all')
const toastMessage = ref<string | null>(null)
const toastType = ref<'success' | 'error' | 'info'>('info')

// Show success toast if redirected from OAuth
if (route.query.connected === 'true') {
  toastMessage.value = 'Google account connected successfully.'
  toastType.value = 'success'
}

const stats = computed(() => ({
  total: sites.value.length,
  verified: sites.value.filter(s => s.verificationStatus === 'verified').length,
  pending: sites.value.filter(s => ['discovered', 'pending_verification'].includes(s.verificationStatus)).length,
  manual: sites.value.filter(s => s.verificationStatus === 'manual_required').length,
  sitemaps: sites.value.filter(s => s.sitemapStatus === 'submitted' || s.sitemapStatus === 'generated').length,
  missingSitemaps: sites.value.filter(s => s.sitemapStatus === 'missing').length
}))

const filteredSites = computed(() => {
  if (activeFilter.value === 'all') return sites.value
  if (activeFilter.value === 'verified') return sites.value.filter(s => s.verificationStatus === 'verified')
  if (activeFilter.value === 'pending') return sites.value.filter(s => ['discovered', 'pending_verification', 'adding', 'verifying'].includes(s.verificationStatus))
  if (activeFilter.value === 'manual') return sites.value.filter(s => s.verificationStatus === 'manual_required')
  return sites.value
})

const filters: { key: Filter; label: string; count: () => number }[] = [
  { key: 'all', label: 'All', count: () => stats.value.total },
  { key: 'pending', label: 'Pending', count: () => stats.value.pending },
  { key: 'verified', label: 'Verified', count: () => stats.value.verified },
  { key: 'manual', label: 'Manual', count: () => stats.value.manual },
]

async function reconnectGoogle() {
  try {
    const res = await fetch('/api/auth-url')
    const data = await res.json()
    if (data.url) window.location.href = data.url
  } catch { /* ignore */ }
}

async function handleSync() {
  await syncAll()
  if (syncStarted.value) {
    toastMessage.value = stats.value.pending > 0
      ? 'Sync started — DNS verification runs in the background.'
      : 'Sitemap processing started in the background.'
    toastType.value = 'success'
  }
  if (syncError.value) {
    toastMessage.value = syncError.value
    toastType.value = 'error'
  }
}

async function handleRefresh() {
  await fetchSites()
  if (error.value) {
    toastMessage.value = error.value
    toastType.value = 'error'
  }
}

function handleDisconnected() {
  googleConnected.value = false
  toastMessage.value = 'Google account disconnected.'
  toastType.value = 'info'
  fetchSites()
}

onMounted(async () => {
  await fetchSites()
  // Auto-sync discovered sites without requiring manual click
  if (googleConnected.value && stats.value.pending > 0 && !syncing.value) {
    await handleSync()
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header with stats -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold">Sites</h1>
        <div class="flex items-center gap-2 text-xs text-text-muted">
          <span
            class="w-2 h-2 rounded-full"
            :class="googleConnected ? 'bg-success' : 'bg-danger'"
          ></span>
          {{ googleConnected ? 'Google connected' : 'Not connected' }}
        </div>
      </div>

      <!-- Stats bar -->
      <div v-if="stats.total > 0" class="text-sm text-text-secondary">
        {{ stats.total }} sites &middot; {{ stats.verified }} verified &middot; {{ stats.pending }} pending &middot; {{ stats.sitemaps }} sitemaps
      </div>
    </div>

    <!-- Actions row -->
    <div class="flex items-center gap-2">
      <button
        v-if="googleConnected && (stats.pending > 0 || stats.missingSitemaps > 0)"
        @click="handleSync"
        :disabled="syncing"
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
      >
        <svg v-if="syncing" class="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ syncing ? 'Syncing...' : stats.pending > 0 ? `Sync ${stats.pending} Pending` : `Submit ${stats.missingSitemaps} Sitemaps` }}
      </button>
      <button
        @click="handleRefresh"
        :disabled="loading"
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-glass border border-glass-border hover:bg-surface-overlay disabled:opacity-50 text-text-secondary text-sm transition-colors"
      >
        <svg v-if="loading" class="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Refresh
      </button>
    </div>

    <!-- Auth error inline -->
    <div v-if="isAuthError" class="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
      Google token expired.
      <button @click="reconnectGoogle" class="underline font-medium">Reconnect</button>
    </div>

    <!-- Filter tabs -->
    <div v-if="stats.total > 0" class="flex gap-1 border-b border-glass-border pb-px">
      <button
        v-for="f in filters"
        :key="f.key"
        @click="activeFilter = f.key"
        class="px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors"
        :class="activeFilter === f.key
          ? 'text-accent border-b-2 border-accent'
          : 'text-text-muted hover:text-text-secondary'"
      >
        {{ f.label }}
        <span class="ml-1 opacity-60">{{ f.count() }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading && !sites.length" class="flex justify-center py-12">
      <svg class="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <!-- Site list -->
    <div v-else class="space-y-2">
      <SiteCard
        v-for="site in filteredSites"
        :key="site.domain"
        :site="site"
        :syncing="syncing && syncStarted"
      />
    </div>

    <!-- Empty state -->
    <div v-if="!loading && filteredSites.length === 0 && stats.total > 0" class="text-center py-8 text-text-muted text-sm">
      No sites match this filter.
    </div>
    <div v-if="!loading && stats.total === 0 && !error" class="text-center py-12 text-text-muted text-sm">
      No sites found. Check your Netlify token in Setup below.
    </div>

    <!-- Setup panel -->
    <SetupPanel
      :google-connected="googleConnected"
      :site-count="stats.total"
      @disconnected="handleDisconnected"
    />

    <!-- Toast -->
    <ToastNotification
      :message="toastMessage"
      :type="toastType"
      @dismiss="toastMessage = null"
    />
  </div>
</template>
