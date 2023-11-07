<template>
  <div class="absolute inset-0 z-999 bg-black" v-if="show">
    <div class="absolute top-1/2 left-1/2 -translate-1/2 w-full max-w-10/12">
      <Progress :percent="percent" class="h-10! lg:h-16!" />
      <p class="mt-2 text-base lg:text-2xl text-center text-white">{{ text }}</p>
      <button
        class="m-auto mt-12 block rounded-full text-white text-base lg:text-2xl px-10 py-2 cursor-pointer bg-blue disabled:bg-gray-300 disabled:text-gray"
        :disabled="percent < 100"
        @click="handleClose"
      >
        进入
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Progress from '@/components/shared/progress/index.vue'

export interface ProgressMaskProps {
  percent?: number
  text?: string
}

const props = withDefaults(defineProps<ProgressMaskProps>(), {
  percent: 0,
  text: '加载中...'
})
const emits = defineEmits(['enter'])

const show = ref(true)
const handleClose = () => {
  if(props.percent < 100) return
  show.value = false
  emits('enter')
}
</script>
