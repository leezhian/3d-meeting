<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Core } from '@/helpers/core'
import { ON_GLOBAL_LOAD_PROGRESS, ON_PLAYER_ACTION } from '@/helpers/constants'
import ProgressMask from '@/components/progress-mask/index.vue'
import AnimGroup from '@/components/anim-group/index.vue'

let loadingPercent = ref(0)
let loadingText = ref('加载中...')
let core: Core
let enterGame = ref(false)
const presetAnimations = ref([
  { label: 'Dance', value: 'dancing' },
  { label: 'Hi', value: 'waving' },
])

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
  enterGame.value = true
  core.control.enabled()
  core.world.environment.playVideo()
  core.emitter.off(ON_GLOBAL_LOAD_PROGRESS, onLoadProgress)
}

const handlePlayerAction = (value: string) => {
  core.emitter.emit(ON_PLAYER_ACTION, value)
}
</script>

<template>
  <ProgressMask :percent="loadingPercent" :text="loadingText" @enter="handlePlay" />
  <AnimGroup :options="presetAnimations" @click="handlePlayerAction" v-if="enterGame" />
</template>
