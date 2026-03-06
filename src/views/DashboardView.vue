<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useSites } from '../composables/useSites'
import { useSync } from '../composables/useSync'
import SiteCard from '../components/SiteCard.vue'
import SyncButton from '../components/SyncButton.vue'

const { sites, loading, error, googleConnected, googleError, fetchSites } = useSites()
const { syncing, syncResult, syncError, syncAll } = useSync()

const stats = computed(() => ({
  total: sites.value.length,
  verified: sites.value.filter(s => s.verificationStatus === 'verified').length,
  pending: sites.value.filter(s => ['discovered', 'pending_verification'].includes(s.verificationStatus)).length,
  manual: sites.value.filter(s => s.verificationStatus === 'manual_required').length
}))

async function handleSyncAll() {
  await syncAll()
  await fetchSites()
}

onMounted(fetchSites)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Sites</h1>
        <p class="text-sm text-text-secondary mt-1">
          {{ stats.total }} sites &middot;
          {{ stats.verified }} verified &middot;
          {{ stats.pending }} pending
          <span v-if="stats.manual"> &middot; {{ stats.manual }} manual</span>
        </p>
      </div>
      <div class="flex gap-2">
        <SyncButton :loading="loading" @click="fetchSites">Refresh</SyncButton>
        <SyncButton v-if="googleConnected" :loading="syncing" @click="handleSyncAll">Sync All</SyncButton>
      </div>
    </div>

    <!-- Google not connected banner -->
    <div v-if="!loading && !googleConnected" class="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
      <p class="font-medium text-warning">Google account not connected</p>
      <p class="text-text-secondary mt-1">
        Go to <router-link to="/settings" class="text-accent hover:underline">Settings</router-link>
        to connect your Google account before syncing sites to Search Console.
      </p>
    </div>

    <!-- Sync Result Banner -->
    <div v-if="syncResult" class="rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
      <p class="font-medium text-success">Sync complete</p>
      <p class="text-text-secondary mt-1">
        {{ syncResult.added }} added &middot;
        {{ syncResult.verified }} verified &middot;
        {{ syncResult.skipped }} skipped
      </p>
      <div v-if="syncResult.errors.length" class="mt-2 space-y-1">
        <p v-for="e in syncResult.errors" :key="e.domain" class="text-xs text-warning">
          {{ e.domain }}: {{ e.error }}
        </p>
      </div>
    </div>

    <!-- Google API Error -->
    <div v-if="googleError" class="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
      <p class="font-medium text-warning">Google API error</p>
      <p class="text-text-secondary mt-1">{{ googleError }}. Try
        <router-link to="/settings" class="text-accent hover:underline">reconnecting your account</router-link>.
      </p>
    </div>

    <!-- Error -->
    <div v-if="error || syncError" class="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
      {{ error || syncError }}
    </div>

    <!-- Loading -->
    <div v-if="loading && !sites.length" class="flex justify-center py-12">
      <svg class="animate-spin h-8 w-8 text-accent" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <!-- Site Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <SiteCard
        v-for="site in sites"
        :key="site.domain"
        :site="site"
      />
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !sites.length && !error" class="text-center py-12 text-text-muted">
      <p>No sites found. Make sure your Netlify token is configured.</p>
    </div>
  </div>
</template>
