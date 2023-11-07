<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Core } from '@/helpers/core'
import { ON_GLOBAL_LOAD_PROGRESS } from '@/helpers/constants'
import ProgressMask from '@/components/progress-mask/index.vue'

let loadingPercent = ref(0)
let loadingText = ref('加载中...')
let core: Core

onMounted(() => {
  core = new Core()
  core.render()

  core.emitter.on(ON_GLOBAL_LOAD_PROGRESS, onLoadProgress)
})

onBeforeUnmount(() => {
  core.destory()
})

const onLoadProgress = ([{ url, loaded, total }]: [
  { url: string; loaded: number; total: number },
]) => {
  const percent = Math.floor((loaded / total) * 100)
  loadingPercent.value = percent
  if (/.*\.(blob|glb|fbx)$/i.test(url)) {
    loadingText.value = '加载模型中...'
  }
  if (url.includes('wasm')) {
    loadingText.value = '加载wasm中...'
  }
  if (/.*\.(jpg|png|jpeg)$/i.test(url)) {
    loadingText.value = '加载图片素材中...'
  }
  if (/.*\.(m4a|mp3)$/i.test(url)) {
    loadingText.value = '加载声音资源中...'
  }
  if (percent === 100) {
    loadingText.value = '加载完成'
  }
}

const handlePlay = () => {
  core.control.enabled()
  core.emitter.off(ON_GLOBAL_LOAD_PROGRESS, onLoadProgress)
}
</script>

<template>
  <!-- <AnimGroup :options="animActions" @click="handlePlayerAction" /> -->
  <ProgressMask :percent="loadingPercent" :text="loadingText" @enter="handlePlay" />
</template>
