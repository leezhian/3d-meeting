<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as dat from 'dat.gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Octree } from 'three/examples/jsm/math/Octree.js'
import { OctreeHelper } from 'three/examples/jsm/helpers/OctreeHelper.js'
import { Capsule } from 'three/examples/jsm/math/Capsule.js'
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

const gui = new dat.GUI()
const canvasRef = ref<HTMLCanvasElement>()
let scene: THREE.Scene
let animationMixer: THREE.AnimationMixer
let player: THREE.Group<THREE.Object3DEventMap>
const playerTransformed = new THREE.Vector3()
let isRunning = false
let playerOnFloor = false
const keyStates: Record<string, boolean> = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
}
let worldOctree: Octree

onMounted(() => {
  if (!canvasRef.value) return
  init(canvasRef.value)

  const debugObj = {
    showOctreeHelper: false,
    drawCapsule: () => {
      console.log('234')
    },
  }
  scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    75,
    canvasInfo.width / canvasInfo.height,
  )
  camera.position.set(0, 3, -5)
  const playerCollider = new Capsule(
    new THREE.Vector3(0, 0, 6),
    new THREE.Vector3(0, 1, 6),
    0.3,
  )

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
    player.position.set(0, 0, 6)
    // player.position.y = 1
    scene.add(player)
    controls.target = player.position

    await loadAnimations()
    animationMixer = startAnimationOfName(player, animations, 'idle')
  })

  const gltfLoader = new GLTFLoader()
  let octreeHelper: OctreeHelper
  worldOctree = new Octree()
  gltfLoader.load('/modals/meeting.glb', (gltf) => {
    scene.add(gltf.scene)
    // TODO screen 添加视频
    worldOctree.fromGraphNode(gltf.scene)
    octreeHelper = new OctreeHelper(worldOctree)
    octreeHelper.visible = debugObj.showOctreeHelper
    scene.add(octreeHelper)
  })

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  /**
   * @description: 人物控制
   * @param {number} deltaTime
   * @return {void}
   */  
  function playerControls(deltaTime: number) {
    if (Object.values(keyStates).every((b) => !b)) return

    // 保证不同刷新率的屏幕相同时间位移一样
    const speed = deltaTime * 4
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

    if (forword) {
      playerTransformed.z -= speed * forword
    }

    if (side) {
      playerTransformed.x += speed * side
    }

    playerTransformed.applyAxisAngle(
      THREE.Object3D.DEFAULT_UP,
      controlRotationAngle,
    )

    if (!isRunning) {
      isRunning = true
      animationMixer = startAnimationOfName(player, animations, 'running')
    }
  }

  /**
   * @description: 更新任务位置
   * @param {number} deltaTime
   * @return {void}
   */  
  function updatePlayer(deltaTime: number) {
    if (!player || !camera) return
    // const d = Math.min( 0.05, deltaTime) 
    // let damping = Math.exp(-4 * d) - 1

    // if (!playerOnFloor) {
    //   playerTransformed.y -= 50 * deltaTime
    //   // small air resistance
    //   damping *= 0.1
    // }
    

    // playerTransformed.addScaledVector(playerTransformed, damping)
    playerCollider.translate(playerTransformed)
    playerCollisions()
    // console.log(playerCollider);
    
    const diff = camera.position.clone().sub(player.position) // 计算相机与人物的向量差
    player.position.copy(playerCollider.start)
    camera.position.copy(diff.add(player.position))
    controls.target = player.position
    playerTransformed.set(0, 0, 0)
  }

  /**
   * @description: 人物碰撞检测
   * @return {void}
   */
  function playerCollisions() {
    const result = worldOctree.capsuleIntersect(playerCollider)
    if (result.depth) {
      playerOnFloor = result.normal.y > 0
      // if (!playerOnFloor) {
      //   playerTransformed.addScaledVector(
      //     result.normal,
      //     -result.normal.dot(playerTransformed),
      //   )
      // }
      playerCollider.translate(result.normal.multiplyScalar(result.depth))      
    }
  }

  // 事件监听------------------------
  listen('resize', (canvasInfo: CanvasInfo) => {
    camera.aspect = canvasInfo.width / canvasInfo.height
    camera.updateProjectionMatrix()
  })

  // let clock = new THREE.Clock()
  listen('tick', (deltaTime: number) => {
    playerControls(deltaTime)
    updatePlayer(deltaTime)
    controls.update()
    webGLRender?.render(scene, camera)
    if (animationMixer) {
      animationMixer.update(deltaTime)
    }
  })

  gui
    .add(debugObj, 'showOctreeHelper')
    .name('开启 OctreeHelper')
    .onChange((checked: boolean) => {
      octreeHelper.visible = checked
    })
  gui.add(debugObj, 'drawCapsule').name('绘制 Capsule')

  onBeforeUnmount(() => {
    unbindEvents()
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
  })
  // function playerCollisions() {
  //   const result = worldOctree.capsuleIntersect(player)
  // }
})

function onKeyDown(e: KeyboardEvent) {
  if (!Object.keys(keyStates).includes(e.key)) return
  keyStates[e.key] = true
}

function onKeyUp(e: KeyboardEvent) {
  if (!Object.keys(keyStates).includes(e.key)) return
  keyStates[e.key] = false
  if (Object.values(keyStates).every((b) => !b)) {
    isRunning = false
    animationMixer = startAnimationOfName(player, animations, 'idle')
  }
}

onBeforeUnmount(() => {
  gui.destroy()
  unbindEvents()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
  <canvas ref="canvasRef"></canvas>
  <!-- <LoginModal /> -->
</template>
