<script setup lang="ts">
import type { ManagedSite } from '../types'
import StatusBadge from './StatusBadge.vue'

defineProps<{ site: ManagedSite; syncing?: boolean }>()
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-3 rounded-lg border border-glass-border bg-glass backdrop-blur-sm hover:border-border transition-colors">
    <!-- Status dot -->
    <span
      class="w-2.5 h-2.5 rounded-full shrink-0"
      :class="{
        'bg-success': site.verificationStatus === 'verified',
        'bg-warning': site.verificationStatus === 'pending_verification' || site.verificationStatus === 'discovered',
        'bg-danger': site.verificationStatus === 'error',
        'bg-text-muted': site.verificationStatus === 'manual_required',
        'animate-pulse': syncing && site.verificationStatus !== 'verified'
      }"
    ></span>

    <!-- Domain info -->
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-medium text-text-primary truncate">{{ site.domain }}</h3>
      </div>
      <p class="text-xs text-text-muted truncate">
        {{ site.netlifySiteName }}
        <span v-if="site.hasManagedDns"> &middot; Netlify DNS</span>
        <span v-if="site.gscExists"> &middot; In GSC</span>
      </p>
    </div>

    <!-- Status badge -->
    <StatusBadge :status="site.verificationStatus" class="shrink-0" />
  </div>
</template>
