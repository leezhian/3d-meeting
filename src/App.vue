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
  camera.position.set(0, 2, -3)

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

  const fbxLoader = new FBXLoader()
  fbxLoader.load('/modals/girl.fbx', async (fbxData) => {
    player = fbxData
    player.scale.set(0.01, 0.01, 0.01)
    scene.add(player)

    console.log('camera', camera.position)
    console.log('player', player.position)
    
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

    if (e.key === 'ArrowUp') {
      player.rotation.y = controlRotationAngle + Math.PI
      camera.position.z += 0.2
    } else if (e.key === 'ArrowDown') {
      player.rotation.y = controlRotationAngle
      camera.position.z -= 0.2
    } else if (e.key === 'ArrowLeft') {
      player.rotation.y = controlRotationAngle - Math.PI / 2
      camera.position.x += 0.2
    } else if (e.key === 'ArrowRight') {
      player.rotation.y = controlRotationAngle + Math.PI / 2
      camera.position.x -= 0.2
    }
    
    player.translateZ(0.2)
    console.log('camera', camera.position)
    console.log('player', player.position)

    const playerDirection = new THREE.Vector3()
    player.getWorldDirection(playerDirection) // 获取相对世界空间下，player的坐标
    playerDirection.normalize()
    playerDirection.multiplyScalar(0.2)
    // if (e.key === 'ArrowUp') {
    //   camera.position.z = camera.position.z + player.position.z
    // } else if (e.key === 'ArrowDown') {
    //   camera.position.x = camera.position.x - player.position.x
    // } else if (e.key === 'ArrowLeft') {
    //   camera.position.z = camera.position.z + player.position.z
    // } else if (e.key === 'ArrowRight') {
    //   camera.position.x = camera.position.x + player.position.x
    // }
    console.log('playerDirection', playerDirection)
    console.log('camera-result', camera.position)
    // camera.position.set(camera.position.x + playerDirection.x, camera.position.y, camera.position.z)
    controls.target = player.position

    if (!isRunning) {
      isRunning = true
      animationMixer = startAnimationOfName(player, animations, 'running')
    }
  })

  window.addEventListener('keyup', (e) => {
    if (!Object.keys(keyStatusMap).includes(e.key)) return
    keyStatusMap[e.key] = false
    if(Object.values(keyStatusMap).every(b => !b)) {
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
