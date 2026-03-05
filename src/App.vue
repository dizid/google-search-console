<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen">
    <!-- Nav -->
    <nav class="border-b border-border bg-surface-raised/50 backdrop-blur-sm sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <RouterLink to="/" class="text-lg font-semibold text-text-primary">
          GSC Manager
        </RouterLink>
        <div class="flex gap-4">
          <RouterLink to="/" class="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Dashboard
          </RouterLink>
          <RouterLink to="/settings" class="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Settings
          </RouterLink>
        </div>
      </div>
    </nav>

    <!-- Content -->
    <main class="max-w-6xl mx-auto px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>
