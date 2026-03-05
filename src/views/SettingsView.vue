<script setup lang="ts">
import { ref, onMounted } from 'vue'

const authLoading = ref(false)
const connected = ref(false)
const statusLoading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/api/auth-status')
    const data = await res.json()
    connected.value = data.connected
  } finally {
    statusLoading.value = false
  }
})

async function connectGoogle() {
  authLoading.value = true
  try {
    const res = await fetch('/api/auth-url')
    const data = await res.json()
    if (data.url) window.location.href = data.url
  } catch {
    authLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-xl space-y-8">
    <h1 class="text-2xl font-bold">Settings</h1>

    <section class="rounded-xl border border-glass-border bg-glass backdrop-blur-sm p-6 space-y-4">
      <h2 class="text-lg font-semibold">Google Account</h2>

      <!-- Connection status -->
      <div v-if="!statusLoading" class="flex items-center gap-2 text-sm">
        <span
          :class="connected ? 'bg-green-500' : 'bg-red-500'"
          class="w-2 h-2 rounded-full"
        ></span>
        <span>{{ connected ? 'Connected' : 'Not connected' }}</span>
      </div>

      <p v-if="!connected && !statusLoading" class="text-sm text-text-secondary">
        Connect your Google account to enable Search Console access.
      </p>

      <button
        v-if="!connected && !statusLoading"
        @click="connectGoogle"
        :disabled="authLoading"
        class="w-fit px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
      >
        {{ authLoading ? 'Redirecting...' : 'Connect Google Account' }}
      </button>
    </section>
  </div>
</template>
