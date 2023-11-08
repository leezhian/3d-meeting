<template>
  <div class="w-full h-16 bg-gray-300 rounded-full overflow-hidden">
    <div
      class="w-full h-full bg-blue origin-top-left transition-transform"
      :style="{ transform: `scaleX(${percent / 100})` }"
    ></div>
  </div>
</template>

<script setup lang="ts">
export interface ProgressProps {
  percent?: number
}

withDefaults(defineProps<ProgressProps>(), {
  percent: 0,
})
</script>
