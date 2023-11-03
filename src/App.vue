<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import {
  webGLRender,
  canvasInfo,
  animations,
  unbindEvents,
  listen,
  init,
  loadAnimations,
  startAnimationOfName,
} from '@/helpers/core'
import type { CanvasInfo } from '@/helpers/core'
// import LoginModal from "@/components/shared/login-modal/index.vue"

const canvasRef = ref<HTMLCanvasElement>()
let animationMixer: THREE.AnimationMixer
let player: THREE.Group<THREE.Object3DEventMap>
let isRunning = false

onMounted(() => {
  if (!canvasRef.value) return
  init(canvasRef.value)

  const camera = new THREE.PerspectiveCamera(
    75,
    canvasInfo.width / canvasInfo.height,
  )
  camera.position.set(0, 3, -5)

  const scene = new THREE.Scene()
  const axesHelper = new THREE.AxesHelper(5)
  scene.add(axesHelper)

  // 灯光
  const ambientLight = new THREE.AmbientLight(0xffffff)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.shadow.mapSize.set(1024, 1024)
  directionalLight.shadow.camera.far = 15
  directionalLight.shadow.camera.left = -7
  directionalLight.shadow.camera.top = 7
  directionalLight.shadow.camera.right = 7
  directionalLight.shadow.camera.bottom = -7
  directionalLight.position.set(5, 5, 5)
  scene.add(ambientLight, directionalLight)

  const controls = new OrbitControls(camera, canvasRef.value)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI / 2
  controls.minDistance = 3
  controls.maxDistance = 8

  const fbxLoader = new FBXLoader()
  fbxLoader.load('/modals/girl.fbx', async (fbxData) => {
    player = fbxData
    // 缩放100倍
    player.scale.set(0.01, 0.01, 0.01)
    scene.add(player)
    controls.target = player.position

    await loadAnimations()
    animationMixer = startAnimationOfName(player, animations, 'idle')
  })

  const keyStatusMap: Record<string, boolean> = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  }
  window.addEventListener('keydown', (e) => {
    if (!Object.keys(keyStatusMap).includes(e.key)) return
    const controlRotationAngle = controls.getAzimuthalAngle()
    keyStatusMap[e.key] = true

    const transformed = new THREE.Vector3()
    if (e.key === 'ArrowUp') {
      player.rotation.y = controlRotationAngle + Math.PI
      transformed.z -= 0.2
    } else if (e.key === 'ArrowDown') {
      player.rotation.y = controlRotationAngle
      transformed.z += 0.2
    } else if (e.key === 'ArrowLeft') {
      player.rotation.y = controlRotationAngle - Math.PI / 2
      transformed.x -= 0.2
    } else if (e.key === 'ArrowRight') {
      player.rotation.y = controlRotationAngle + Math.PI / 2
      transformed.x += 0.2
    }

    transformed.applyAxisAngle(THREE.Object3D.DEFAULT_UP, controlRotationAngle)
    player.position.add(transformed)
    camera.position.add(transformed)
    controls.target = player.position

    if (!isRunning) {
      isRunning = true
      animationMixer = startAnimationOfName(player, animations, 'running')
    }
  })

  window.addEventListener('keyup', (e) => {
    if (!Object.keys(keyStatusMap).includes(e.key)) return
    keyStatusMap[e.key] = false
    if (Object.values(keyStatusMap).every((b) => !b)) {
      isRunning = false
      animationMixer = startAnimationOfName(player, animations, 'idle')
    }
  })

  // 事件监听------------------------
  listen('resize', (canvasInfo: CanvasInfo) => {
    camera.aspect = canvasInfo.width / canvasInfo.height
    camera.updateProjectionMatrix()
  })

  let clock = new THREE.Clock()
  listen('tick', () => {
    controls.update()
    webGLRender?.render(scene, camera)
    if (animationMixer) {
      animationMixer.update(clock.getDelta())
    }
  })

  onBeforeUnmount(() => {
    unbindEvents()
  })
})
</script>

<template>
  <canvas ref="canvasRef"></canvas>
  <!-- <LoginModal /> -->
</template>
