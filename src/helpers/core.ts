/*
 * @Author: kim
 * @Date: 2023-10-31 00:05:36
 * @Description: 
 */
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

export interface CanvasInfo {
  width: number
  height: number
  pixelRatio: number
}

export interface CustomFnMap {
  "resize": (canvasInfo: CanvasInfo) => any
  "tick": () => any
}

interface CustomFnsCache {
  resize: CustomFnMap['resize'][]
  tick: CustomFnMap['tick'][]
}

const customFnsCache: CustomFnsCache = {
  resize: [],
  tick: []
}

export let canvas: HTMLCanvasElement | null = null
export let webGLRender: THREE.WebGLRenderer | null = null
export const canvasInfo: CanvasInfo = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2)
}
export let animations: Record<string, THREE.AnimationClip> = {}

export const init = (canvasElement: HTMLCanvasElement) => {
  if (canvas) {
    console.warn('你已经初始化了')
    return
  }

  canvas = canvasElement
  webGLRender = new THREE.WebGLRenderer({
    canvas
  })

  webGLRender.setSize(canvasInfo.width, canvasInfo.height)
  webGLRender.setPixelRatio(canvasInfo.pixelRatio)
  bindEvents()
  tick()
}

/**
 * @description: 添加监听回调
 * @param {T} type 事件类型
 * @param {CustomFnMap[T]} fn
 * @return {void}
 */
export function listen<T extends keyof CustomFnMap>(type: T, fn: CustomFnMap[T]) {
  if (!customFnsCache[type]) {
    customFnsCache[type] = []
  }

  customFnsCache[type].push(fn as any)
}

/**
 * @description: 移除监听回调
 * @param {T} type 事件类型
 * @param {CustomFnMap[T]} fn
 * @return {void}
 */
export function removeListen<T extends keyof CustomFnMap>(type: T, fn: CustomFnMap[T]) {
  if (!customFnsCache[type]) {
    return
  }

  for (let index = customFnsCache[type].length; index >= 0; index--) {
    if (customFnsCache[type][index] === fn) {
      customFnsCache[type].splice(index, 1)
    }
  }
}

/**
 * @description: 事件绑定
 * @return {void}
 */
function bindEvents() {
  window.addEventListener('resize', resizeHander)
}

/**
 * @description: 事件移除，用于组件卸载时释放内存和移除事件监听
 * @return {void}
 */
export function unbindEvents() {
  window.removeEventListener('resize', resizeHander)
  customFnsCache.resize = []
  customFnsCache.tick = []
  webGLRender = null
  canvas = null
}

/**
 * @description: 窗口大小改变处理
 * @return {void}
 */
function resizeHander() {
  canvasInfo.width = window.innerWidth
  canvasInfo.height = window.innerHeight
  canvasInfo.pixelRatio = Math.min(window.devicePixelRatio, 2)

  webGLRender?.setSize(canvasInfo.width, canvasInfo.height)
  webGLRender?.setPixelRatio(canvasInfo.pixelRatio)

  if (customFnsCache.resize && customFnsCache.resize.length) {
    customFnsCache.resize.forEach(fn => fn(canvasInfo))
  }
}

/**
 * @description: 屏幕刷新（一般用于刷新canvas）
 * @return {void}
 */
function tick() {
  if (customFnsCache.tick && customFnsCache.tick.length) {
    customFnsCache.tick.forEach(fn => fn())
  }

  requestAnimationFrame(tick)
}

/**
 * @description: 加载动画
 * @return {Promise<Record<string, THREE.AnimationClip>>}
 */
export async function loadAnimations() {
  if (!Object.keys(animations).length) {
    const fbxLoader = new FBXLoader()
    fbxLoader.setPath('/animations/')
    const animFbxes = await Promise.all([
      fbxLoader.loadAsync('idle.fbx').then(res => ({idle: res.animations[0]})),
      // fbxLoader.loadAsync('walking.fbx'),
      fbxLoader.loadAsync('running.fbx').then(res => ({running: res.animations[0]})),
    ])

    animations = animFbxes.reduce((o, item) => {
      Object.assign(o, item)
      return o
    }, {})
  }
  return animations
}

/**
 * @description: 开始动画
 * @param {THREE} object3d 目前节点
 * @param {Record<string, THREE.AnimationClip>} animations 动画组
 * @param {string} animName 动画名称
 * @return {THREE.AnimationMixer}
 */
export function startAnimationOfName(object3d: THREE.Object3D, animations: Record<string, THREE.AnimationClip>, animName: string) {
  const animationMixer = new THREE.AnimationMixer(object3d)
  const clip = animations[animName]
  
  if (clip) {
    const action = animationMixer.clipAction(clip)
    action.play()
  }

  return animationMixer
}