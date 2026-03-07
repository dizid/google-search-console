<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen">
    <!-- Nav -->
    <nav class="border-b border-border bg-surface-raised/50 backdrop-blur-sm sticky top-0 z-10">
      <div class="max-w-2xl mx-auto px-4 h-12 flex items-center">
        <span class="text-base font-semibold text-text-primary">GSC Manager</span>
      </div>
    </nav>

    <!-- Content -->
    <main class="max-w-2xl mx-auto px-4 py-4">
      <RouterView />
    </main>
  </div>
</template>
