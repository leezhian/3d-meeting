<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { Core } from '@/helpers/core'

let core: Core
onMounted(() => {
  core = new Core()
  core.render()
})

onBeforeUnmount(() => {
  core.destory()
})
</script>

<template>
  <!-- <AnimGroup :options="animActions" @click="handlePlayerAction" /> -->
  <!-- <LoginModal /> -->
</template>
