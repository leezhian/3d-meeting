<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
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
const keyStates: Record<string, boolean> = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
}

onMounted(() => {
  if (!canvasRef.value) return
  init(canvasRef.value)

  const camera = new THREE.PerspectiveCamera(
    75,
    canvasInfo.width / canvasInfo.height,
  )
  camera.position.set(0, 3, -5)

  const scene = new THREE.Scene()
  // const axesHelper = new THREE.AxesHelper(5)
  // scene.add(axesHelper)

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

  const gltfLoader = new GLTFLoader()
  gltfLoader.load('/modals/meeting.glb', (gltf) => {
    scene.add(gltf.scene)
  })

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  function handleControls() {
    if (Object.values(keyStates).every((b) => !b)) return

    let forword = 0 // 0 代表没有前后 1表示前 -1表示后
    let side = 0
    for (let code in keyStates) {
      if (!keyStates[code]) continue
      switch (code) {
        case 'ArrowUp':
          forword += 1
          break
        case 'ArrowDown':
          forword -= 1
          break
        case 'ArrowLeft':
          side -= 1
          break
        case 'ArrowRight':
          side += 1
          break
      }
    }

    const controlRotationAngle = controls.getAzimuthalAngle()
    // 计算旋转角度
    // remark: 因为相机与人物向前朝向永远差 PI 的弧度（可以理解为为了向前时相机总看到人物背面，因此旋转了PI弧度）
    const playRotateRelativeToCamera =
      ((forword <= 0 ? 0 : Math.PI * (side ? side : 1)) +
        (Math.PI * side) / 2) /
      (forword && side ? 2 : 1)
    player.rotation.y = controlRotationAngle + playRotateRelativeToCamera

    const transformed = new THREE.Vector3()
    if (forword) {
      transformed.z -= 0.01 * forword
    }

    if (side) {
      transformed.x += 0.01 * side
    }

    transformed.applyAxisAngle(THREE.Object3D.DEFAULT_UP, controlRotationAngle)
    player.position.add(transformed)
    camera.position.add(transformed)
    controls.target = player.position

    if (!isRunning) {
      isRunning = true
      animationMixer = startAnimationOfName(player, animations, 'running')
    }
  }

  // 事件监听------------------------
  listen('resize', (canvasInfo: CanvasInfo) => {
    camera.aspect = canvasInfo.width / canvasInfo.height
    camera.updateProjectionMatrix()
  })

  // let clock = new THREE.Clock()
  listen('tick', (deltaTime: number) => {
    // console.log(deltaTime);
    handleControls()
    controls.update()
    webGLRender?.render(scene, camera)
    if (animationMixer) {
      animationMixer.update(deltaTime)
    }
  })

  onBeforeUnmount(() => {
    unbindEvents()
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
  })

  function onKeyDown(e: KeyboardEvent) {
    if (!Object.keys(keyStates).includes(e.key)) return
    const controlRotationAngle = controls.getAzimuthalAngle()
    keyStates[e.key] = true

    // const transformed = new THREE.Vector3()
    if (e.key === 'ArrowUp') {
      player.rotation.y = controlRotationAngle + Math.PI
    } else if (e.key === 'ArrowDown') {
      player.rotation.y = controlRotationAngle
    } else if (e.key === 'ArrowLeft') {
      player.rotation.y = controlRotationAngle - Math.PI / 2
    } else if (e.key === 'ArrowRight') {
      player.rotation.y = controlRotationAngle + Math.PI / 2
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (!Object.keys(keyStates).includes(e.key)) return
    keyStates[e.key] = false
    if (Object.values(keyStates).every((b) => !b)) {
      isRunning = false
      animationMixer = startAnimationOfName(player, animations, 'idle')
    }
  }
})
</script>

<template>
  <canvas ref="canvasRef"></canvas>
  <!-- <LoginModal /> -->
</template>
