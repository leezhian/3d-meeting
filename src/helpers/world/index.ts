/*
 * @Author: kim
 * @Date: 2023-11-06 23:08:20
 * @Description: 世界管理
 */
import { Scene, PerspectiveCamera } from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Emitter } from '@/helpers/emitter'
import { Player } from '@/helpers/player'
import { Meeting } from '@/helpers/scene/meeting'
import type { Loader } from '@/helpers/loader'
import type { Control } from '@/helpers/control'

export interface WorldOptions {
  scene: Scene
  camera: PerspectiveCamera
  emitter: Emitter
  orbitControls: OrbitControls
  control: Control,
  loader: Loader
}

export class World {
  private scene: Scene
  private camera: PerspectiveCamera

  private emitter: Emitter
  private orbitControls: OrbitControls
  player: Player
  environment: Meeting
  private loader: Loader
  private control: Control

  constructor({ scene, camera, emitter, orbitControls, loader, control }: WorldOptions) {
    this.scene = scene
    this.camera = camera
    this.orbitControls = orbitControls
    this.control = control
    this.emitter = emitter
    this.loader = loader

    this.player = new Player({
      scene: this.scene,
      camera: this.camera,
      orbitControls: this.orbitControls,
      control: this.control,
      loader: this.loader,
      emitter: this.emitter
    })
    this.environment = new Meeting({
      scene: this.scene,
      camera: this.camera,
      loader: this.loader,
      emitter: this.emitter
    })
  }

  update(delta: number) {
    this.environment.update(delta)
    // 避免初始加载时多余的性能消耗和人物碰撞错误处理
    if(this.environment.octree && this.environment.bvh && this.environment.loaded) {
      this.player.update(delta, this.environment.octree, this.environment.bvh)
    }
  }

  /**
   * @description: 销毁
   * @return {void}
   */  
  destory() {
    this.environment.destory()
  }
}