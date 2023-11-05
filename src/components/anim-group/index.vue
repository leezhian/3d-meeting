<template>
  <div class="space-x-2 absolute right-20 bottom-20">
    <template v-for="item in options" :key="item.value">
      <button class="w-12 h-12 rounded-lg bg-white/60 shadow-md hover:bg-white/80" @click="emit('click', item.value)">{{ item.label }}</button>
    </template>
  </div>
</template>

<script setup lang="ts">
export interface AnimButton {
  label: string
  value: string
}

export interface AnimButtonGroup {
  options?: AnimButton[]
}

defineProps<AnimButtonGroup>()
const emit = defineEmits<{
  (e: 'click', value: string): void
}>()
</script>