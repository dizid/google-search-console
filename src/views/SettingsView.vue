<script setup lang="ts">
import { ref } from 'vue'

const authLoading = ref(false)

async function connectGoogle() {
  authLoading.value = true
  try {
    const res = await fetch('/api/auth-url')
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    }
  } catch {
    authLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-xl space-y-8">
    <h1 class="text-2xl font-bold">Settings</h1>

    <!-- Google Account -->
    <section class="rounded-xl border border-glass-border bg-glass backdrop-blur-sm p-6 space-y-4">
      <h2 class="text-lg font-semibold">Google Account</h2>
      <p class="text-sm text-text-secondary">
        Connect your Google account to enable Search Console access. This is a one-time setup —
        after connecting, copy the refresh token to your Netlify environment variables.
      </p>
      <div class="flex flex-col gap-3">
        <button
          @click="connectGoogle"
          :disabled="authLoading"
          class="w-fit px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {{ authLoading ? 'Redirecting...' : 'Connect Google Account' }}
        </button>
      </div>

      <div class="text-xs text-text-muted space-y-1 border-t border-border pt-4">
        <p><strong>Required env vars:</strong></p>
        <ul class="list-disc list-inside space-y-0.5">
          <li><code class="text-text-secondary">GOOGLE_CLIENT_ID</code></li>
          <li><code class="text-text-secondary">GOOGLE_CLIENT_SECRET</code></li>
          <li><code class="text-text-secondary">GOOGLE_REDIRECT_URI</code></li>
          <li><code class="text-text-secondary">GOOGLE_REFRESH_TOKEN</code> (obtained after connecting)</li>
        </ul>
      </div>
    </section>

    <!-- Netlify -->
    <section class="rounded-xl border border-glass-border bg-glass backdrop-blur-sm p-6 space-y-4">
      <h2 class="text-lg font-semibold">Netlify</h2>
      <p class="text-sm text-text-secondary">
        A Netlify Personal Access Token is required to discover your sites and manage DNS records.
      </p>
      <div class="text-xs text-text-muted space-y-1 border-t border-border pt-4">
        <p><strong>Required env var:</strong></p>
        <ul class="list-disc list-inside">
          <li><code class="text-text-secondary">NETLIFY_TOKEN</code></li>
        </ul>
        <p class="mt-2">
          Generate at
          <a href="https://app.netlify.com/user/applications#personal-access-tokens" target="_blank" class="text-accent hover:underline">
            app.netlify.com/user/applications
          </a>
        </p>
      </div>
    </section>

    <!-- Setup Guide -->
    <section class="rounded-xl border border-glass-border bg-glass backdrop-blur-sm p-6 space-y-4">
      <h2 class="text-lg font-semibold">Google Cloud Setup</h2>
      <ol class="text-sm text-text-secondary space-y-2 list-decimal list-inside">
        <li>Go to <a href="https://console.cloud.google.com" target="_blank" class="text-accent hover:underline">Google Cloud Console</a></li>
        <li>Create or select a project</li>
        <li>Enable the <strong>Google Search Console API</strong> and <strong>Google Site Verification API</strong></li>
        <li>Go to Credentials → Create Credentials → OAuth 2.0 Client ID</li>
        <li>Application type: <strong>Web application</strong></li>
        <li>Add authorized redirect URI: <code class="text-text-secondary">https://your-site.netlify.app/api/auth-callback</code></li>
        <li>Copy Client ID and Client Secret to your env vars</li>
        <li>Click "Connect Google Account" above to complete the flow</li>
      </ol>
    </section>
  </div>
</template>
