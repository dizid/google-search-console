<script setup lang="ts">
import type { ManagedSite } from '../types'
import StatusBadge from './StatusBadge.vue'

defineProps<{ site: ManagedSite }>()
defineEmits<{ sync: [domain: string] }>()
</script>

<template>
  <div class="rounded-xl border border-glass-border bg-glass backdrop-blur-sm p-4 flex flex-col gap-3 hover:border-border transition-colors">
    <!-- Header -->
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-text-primary truncate">{{ site.domain }}</h3>
        <p class="text-xs text-text-muted truncate">{{ site.netlifySiteName }}</p>
      </div>
      <StatusBadge :status="site.verificationStatus" />
    </div>

    <!-- Details -->
    <div class="flex flex-wrap gap-2 text-xs text-text-secondary">
      <span v-if="site.hasManagedDns" class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-success"></span>
        Netlify DNS
      </span>
      <span v-else class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-warning"></span>
        External DNS
      </span>
      <span v-if="site.gscExists" class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-success"></span>
        In GSC
      </span>
    </div>

    <!-- Error -->
    <p v-if="site.error" class="text-xs text-danger">{{ site.error }}</p>

    <!-- Actions -->
    <div class="flex gap-2 mt-auto" v-if="site.verificationStatus !== 'verified'">
      <button
        v-if="site.hasManagedDns"
        @click="$emit('sync', site.domain)"
        class="text-xs px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
      >
        Verify
      </button>
      <span v-else class="text-xs text-text-muted">
        Add TXT record manually
      </span>
    </div>
  </div>
</template>
