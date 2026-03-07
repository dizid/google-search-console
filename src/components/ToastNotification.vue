<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  message: string | null
  type?: 'success' | 'error' | 'info'
  duration?: number
}>()

const emit = defineEmits<{ dismiss: [] }>()

const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (timer) { clearTimeout(timer); timer = null }
}

watch(() => props.message, (msg) => {
  clearTimer()
  if (msg) {
    visible.value = true
    timer = setTimeout(() => {
      visible.value = false
      emit('dismiss')
    }, props.duration ?? 4000)
  } else {
    visible.value = false
  }
}, { immediate: true })

onUnmounted(clearTimer)

const colorMap = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-accent/30 bg-accent/10 text-accent'
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="visible && message"
      @click="visible = false; emit('dismiss')"
      class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 rounded-lg border px-4 py-3 text-sm cursor-pointer shadow-lg"
      :class="colorMap[type ?? 'info']"
    >
      {{ message }}
    </div>
  </Transition>
</template>
