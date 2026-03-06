<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const authLoading = ref(false)
const connected = ref(false)
const statusLoading = ref(true)
const showSuccess = ref(route.query.connected === 'true')

if (showSuccess.value) setTimeout(() => showSuccess.value = false, 5000)

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

    <!-- Success toast -->
    <div v-if="showSuccess" @click="showSuccess = false"
      class="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success cursor-pointer transition-opacity">
      Google account connected successfully.
    </div>

    <section class="rounded-xl border border-glass-border bg-glass backdrop-blur-sm p-6 space-y-4">
      <h2 class="text-lg font-semibold">Google Account</h2>

      <!-- Loading spinner -->
      <div v-if="statusLoading" class="flex justify-center py-4">
        <svg class="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

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

      <button
        v-if="connected && !statusLoading"
        @click="connectGoogle"
        :disabled="authLoading"
        class="w-fit px-4 py-2 rounded-lg bg-glass border border-glass-border hover:bg-glass-hover text-text-secondary text-sm font-medium transition-colors"
      >
        {{ authLoading ? 'Redirecting...' : 'Reconnect with different account' }}
      </button>
    </section>
  </div>
</template>
