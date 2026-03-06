<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const authLoading = ref(false)
const connected = ref(false)
const statusLoading = ref(true)
const statusError = ref<string | null>(null)
const authError = ref<string | null>(null)
const disconnecting = ref(false)
const showSuccess = ref(route.query.connected === 'true')

if (showSuccess.value) setTimeout(() => showSuccess.value = false, 5000)

async function checkStatus() {
  statusLoading.value = true
  statusError.value = null
  try {
    const res = await fetch('/api/auth-status')
    const data = await res.json()
    connected.value = data.connected
    if (!data.connected && data.error) {
      statusError.value = data.error
    }
  } catch {
    connected.value = false
    statusError.value = 'Could not check auth status. Network error.'
  } finally {
    statusLoading.value = false
  }
}

onMounted(checkStatus)

async function connectGoogle() {
  authLoading.value = true
  authError.value = null
  try {
    const res = await fetch('/api/auth-url')
    const data = await res.json()
    if (data.error) {
      authError.value = data.error
      authLoading.value = false
      return
    }
    if (data.url) window.location.href = data.url
  } catch {
    authError.value = 'Failed to start Google OAuth. Check your network connection.'
    authLoading.value = false
  }
}

async function disconnectGoogle() {
  disconnecting.value = true
  try {
    await fetch('/api/auth-disconnect', { method: 'POST' })
    connected.value = false
    statusError.value = null
    showSuccess.value = false
  } catch {
    authError.value = 'Failed to disconnect. Try again.'
  } finally {
    disconnecting.value = false
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

      <!-- Error banner -->
      <div v-if="(statusError || authError) && !statusLoading"
        class="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
        {{ statusError || authError }}
      </div>

      <p v-if="!connected && !statusLoading && !statusError" class="text-sm text-text-secondary">
        Connect your Google account to enable Search Console access.
      </p>

      <!-- Connect / Reconnect button -->
      <button
        v-if="!statusLoading"
        @click="connectGoogle"
        :disabled="authLoading"
        :class="connected
          ? 'bg-glass border border-glass-border hover:bg-glass-hover text-text-secondary'
          : 'bg-accent hover:bg-accent-hover text-white'"
        class="w-fit px-4 py-2 rounded-lg disabled:opacity-50 text-sm font-medium transition-colors"
      >
        {{ authLoading ? 'Redirecting...' : (connected ? 'Reconnect' : 'Connect Google Account') }}
      </button>

      <!-- Disconnect button -->
      <button
        v-if="connected && !statusLoading"
        @click="disconnectGoogle"
        :disabled="disconnecting"
        class="w-fit px-4 py-2 rounded-lg bg-glass border border-danger/30 hover:bg-danger/10 text-danger text-sm font-medium transition-colors disabled:opacity-50"
      >
        {{ disconnecting ? 'Disconnecting...' : 'Disconnect' }}
      </button>
    </section>
  </div>
</template>
