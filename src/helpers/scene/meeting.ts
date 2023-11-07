/*
 * @Author: kim
 * @Date: 2023-11-06 23:01:04
 * @Description: 会议场景
 */
import { Scene, AmbientLight, DirectionalLight } from 'three'
import { Octree } from 'three/examples/jsm/math/Octree.js'
import type { Emitter } from '@/helpers/emitter'
import { Loader } from '@/helpers/loader'
import { AnimationControl } from '@/helpers/animation-control'

export interface MeetingOptions {
  scene: Scene
  emitter: Emitter
  loader: Loader
}

export class Meeting {
  private scene: Scene
  private emitter: Emitter
  private loader: Loader
  private animationControl: AnimationControl
  octree: Octree

  constructor({ scene, emitter, loader }: MeetingOptions) {
    this.scene = scene
    this.emitter = emitter
    this.loader = loader
    this.octree = new Octree()
    this.animationControl = new AnimationControl()

    this.load()
  }

  private async load() {
    await this.loadScene()
    this.initSceneOtherEffects()
    // TODO 通知加载完毕
  }

  private async loadScene() {
    try {
      const gltf = await this.loader.gltfLoader.loadAsync('/modals/meeting.glb')
      
      // 开启阴影
      gltf.scene.traverse(child => {
        child.castShadow = true
        child.receiveShadow = true
      })

      this.scene.add(gltf.scene)
      // 构建八叉树
      this.octree.fromGraphNode(gltf.scene)

      this.animationControl.analyse(gltf.animations)
      this.animationControl.startAnimation(gltf.scene, ['Fan', 'vaccuum_move', 'mediaFrames-bob', 'blackPanel.001Action', 'blackPanel.002Action', 'blackPanel.003Action'])
    } catch (error) {
      console.error('场景初始化出错：', error)
    }
  }

  /**
   * @description: 初始化场景其他元素
   * @return {void}
   */  
  private initSceneOtherEffects() {
    const ambientLight = new AmbientLight(0xffffff)
    const directionalLight = new DirectionalLight(0xffc766, 0.2)
    directionalLight.shadow.mapSize.set(1024, 1024)
    directionalLight.shadow.camera.far = 15
    directionalLight.position.set(-8, 6, 0)
    this.scene.add(ambientLight, directionalLight)
  }

  update(delta: number) {
    this.animationControl.mixer?.update(delta)
  }
}