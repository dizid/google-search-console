<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  googleConnected: boolean
  siteCount: number
}>()

const emit = defineEmits<{
  connected: []
  disconnected: []
}>()

const expanded = ref(false)
const authLoading = ref(false)
const authError = ref<string | null>(null)
const disconnecting = ref(false)

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
    authError.value = 'Failed to start Google OAuth.'
    authLoading.value = false
  }
}

async function disconnectGoogle() {
  disconnecting.value = true
  try {
    await fetch('/api/auth-disconnect', { method: 'POST' })
    emit('disconnected')
  } catch {
    authError.value = 'Failed to disconnect.'
  } finally {
    disconnecting.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-glass-border bg-glass backdrop-blur-sm overflow-hidden">
    <!-- Toggle header -->
    <button
      @click="expanded = !expanded"
      class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
    >
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Setup
      </div>
      <svg
        class="w-4 h-4 transition-transform"
        :class="{ 'rotate-180': expanded }"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Expandable content -->
    <div v-if="expanded" class="px-4 pb-4 space-y-3 border-t border-glass-border pt-3">
      <!-- Google status -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm">
          <span
            class="w-2 h-2 rounded-full"
            :class="googleConnected ? 'bg-success' : 'bg-danger'"
          ></span>
          <span class="text-text-secondary">
            Google: {{ googleConnected ? 'Connected' : 'Not connected' }}
          </span>
        </div>
        <button
          v-if="googleConnected"
          @click="disconnectGoogle"
          :disabled="disconnecting"
          class="text-xs text-danger hover:text-danger/80 disabled:opacity-50"
        >
          {{ disconnecting ? 'Disconnecting...' : 'Disconnect' }}
        </button>
        <button
          v-else
          @click="connectGoogle"
          :disabled="authLoading"
          class="text-xs px-3 py-1 rounded-md bg-accent hover:bg-accent-hover text-white disabled:opacity-50"
        >
          {{ authLoading ? 'Connecting...' : 'Connect' }}
        </button>
      </div>

      <!-- Netlify status -->
      <div class="flex items-center gap-2 text-sm">
        <span class="w-2 h-2 rounded-full bg-success"></span>
        <span class="text-text-secondary">
          Netlify: {{ siteCount }} sites found
        </span>
      </div>

      <!-- Error -->
      <p v-if="authError" class="text-xs text-danger">{{ authError }}</p>
    </div>
  </div>
</template>
