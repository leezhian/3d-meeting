/*
* @Author: kim
* @Date: 2023-11-06 23:00:38
* @Description: 玩家
*/
import { PerspectiveCamera, Scene } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { AnimationControl } from '@/helpers/animation-control'
import type { Loader } from '@/helpers/loader'
import type { Emitter } from '@/helpers/emitter'

export interface PlayerOptions {
  scene: Scene
  camera: PerspectiveCamera
  orbitControls: OrbitControls
  loader: Loader
  emitter: Emitter
}

export class Player {
  private scene: Scene
  private camera: PerspectiveCamera
  private orbitControls: OrbitControls
  private loader: Loader
  private emitter: Emitter
  private animationControl: AnimationControl

  constructor(options: PlayerOptions) {
    this.scene = options.scene
    this.camera = options.camera
    this.orbitControls = options.orbitControls
    this.loader = options.loader
    this.emitter = options.emitter
    this.animationControl = new AnimationControl('/animations/')

    this.load()
  }

  private async load() {
    const player = await this.loader.fbxLoader.loadAsync('/modals/girl.fbx')
    player.scale.set(0.01, 0.01, 0.01)
    await this.animationControl.load({
      idle: 'idle.fbx',
      running: 'running.fbx',
      jump: 'jump.fbx',
      sitting: 'sitting.fbx',
      waving: 'waving.fbx',
      dancing: 'dancing.fbx'
    })
    this.animationControl.startAnimation(player, 'idle')

    this.scene.add(player)
  }

  /**
   * @description: 更新函数
   * @param {number} delta
   * @return {void}
   */  
  update(delta: number) {
    this.animationControl.mixer?.update(delta)
  }
}