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
  unbindEvents,
  listen,
  init,
} from '@/helpers/core'
import type { CanvasInfo } from '@/helpers/core'
import { AnimationControl } from '@/helpers/animation-control'
import AnimGroup from '@/components/anim-group/index.vue'
// import LoginModal from "@/components/shared/login-modal/index.vue"

const gui = new dat.GUI()
const canvasRef = ref<HTMLCanvasElement>()
let scene: THREE.Scene
const playerAnimControl = new AnimationControl('/animations/')
const sceneAnimControl = new AnimationControl()
let player: THREE.Group<THREE.Object3DEventMap>
const playerTransformed = new THREE.Vector3()

let isRunning = false
let playerOnFloor = false
let videoElm: HTMLVideoElement | null
const keyStates: Record<string, boolean> = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
}
let worldOctree: Octree
const animActions = ref([
  { label: 'Dance', value: 'dancing' },
  { label: 'Hi', value: 'waving' },
])

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
  scene.background = new THREE.Color(0xeeeeee)
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
  const directionalLight = new THREE.DirectionalLight(0xffc766, 0.2)
  directionalLight.shadow.mapSize.set(1024, 1024)
  directionalLight.shadow.camera.far = 15
  directionalLight.position.set(-8, 6, 0)
  scene.add(ambientLight, directionalLight)

  const controls = new OrbitControls(camera, canvasRef.value)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI / 2
  controls.minDistance = 1
  controls.maxDistance = 8
  controls.target = playerCollider.end

  const gltfLoader = new GLTFLoader()
  let octreeHelper: OctreeHelper
  worldOctree = new Octree()
  gltfLoader.load('/modals/meeting.glb', (gltf) => {
    scene.add(gltf.scene)
    worldOctree.fromGraphNode(gltf.scene)
    octreeHelper = new OctreeHelper(worldOctree)
    octreeHelper.visible = debugObj.showOctreeHelper
    scene.add(octreeHelper)

    gltf.scene.traverse(child => {
      // if((child as THREE.Mesh).isMesh) {
      //   child.castShadow = true
      //   child.receiveShadow = true
      // }
      if(child.name === 'screen') {
        const videoMesh = child.children[0] as THREE.Mesh
        videoElm = document.createElement('video')
        videoElm.src = 'https://stream7.iqilu.com/10339/article/202002/18/2fca1c77730e54c7b500573c2437003f.mp4'
        // videoElm.autoplay = true
        // video.muted = true
        videoElm.loop = true
        videoElm.crossOrigin = 'anonymous'
        const texture = new THREE.VideoTexture(videoElm)
        const m = new THREE.MeshStandardMaterial({
          map: texture
        })
        videoMesh.material = m
        videoMesh.scale.z = -1
      }
      
      // if(child.name === 'chairNormal001') {
      //   player.rotation.y = Math.PI / 2
      //   playerCollider.set(child.position.clone().sub(new THREE.Vector3(-0.14, 0.3, 0)), child.position.clone().add(new THREE.Vector3(-0.14, 0.7, 0)), playerCollider.radius)
      // }
    })

    // 播放场景动画
    sceneAnimControl.analyse(gltf.animations)
    sceneAnimControl.startAnimation(gltf.scene, ['Fan', 'vaccuum_move', 'mediaFrames-bob', 'blackPanel.001Action', 'blackPanel.002Action', 'blackPanel.003Action'])
  })

  const fbxLoader = new FBXLoader()
  fbxLoader.load('/modals/girl.fbx', async (fbxData) => {
    player = fbxData
    // 缩放100倍
    player.scale.set(0.01, 0.01, 0.01)
    player.position.set(0, 0, 6)
    scene.add(player)
    
    await playerAnimControl.load({
      idle: 'idle.fbx',
      running: 'running.fbx',
      jump: 'jump.fbx',
      sitting: 'sitting.fbx',
      waving: 'waving.fbx',
      dancing: 'dancing.fbx'
    })
    playerAnimControl.startAnimation(player, 'idle')
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
      playerAnimControl.startAnimation(player, 'running')
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
    
    const diff = camera.position.clone().sub(player.position) // 计算相机与人物的向量差
    player.position.copy(playerCollider.start)
    camera.position.copy(diff.add(player.position))
    controls.target = playerCollider.end
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

  listen('tick', (deltaTime: number) => {
    playerControls(deltaTime)
    updatePlayer(deltaTime)
    controls.update()
    playerAnimControl.mixer?.update(deltaTime)
    sceneAnimControl.mixer?.update(deltaTime)
    webGLRender?.render(scene, camera)
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
    playerAnimControl.startAnimation(player, 'idle')
  }
}

onBeforeUnmount(() => {
  videoElm = null
  gui.destroy()
  unbindEvents()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})

function handlePlayerAction(value: string) {
  playerAnimControl.startAnimation(player, value, false)
  function handleFinshed() {
    playerAnimControl.mixer?.removeEventListener('finished', handleFinshed)
    playerAnimControl.startAnimation(player, 'idle')
  }

  playerAnimControl.mixer?.addEventListener('finished', handleFinshed)
}
</script>

<template>
  <AnimGroup :options="animActions" @click="handlePlayerAction" />
  <canvas ref="canvasRef"></canvas>
  <!-- <LoginModal /> -->
</template>
