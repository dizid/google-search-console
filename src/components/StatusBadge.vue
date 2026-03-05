<script setup lang="ts">
import type { SiteStatus } from '../types'

const props = defineProps<{ status: SiteStatus }>()

const config: Record<SiteStatus, { label: string; classes: string }> = {
  discovered: { label: 'Discovered', classes: 'bg-text-muted/20 text-text-secondary' },
  adding: { label: 'Adding...', classes: 'bg-accent/20 text-accent' },
  pending_verification: { label: 'Pending', classes: 'bg-warning/20 text-warning' },
  verifying: { label: 'Verifying...', classes: 'bg-warning/20 text-warning' },
  verified: { label: 'Verified', classes: 'bg-success/20 text-success' },
  error: { label: 'Error', classes: 'bg-danger/20 text-danger' },
  manual_required: { label: 'Manual', classes: 'bg-warning/20 text-warning' }
}
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    :class="config[props.status].classes"
  >
    {{ config[props.status].label }}
  </span>
</template>
