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
import { Loader } from '@/helpers/loader'

export interface WorldOptions {
  scene: Scene
  camera: PerspectiveCamera
  emitter: Emitter
  orbitControls: OrbitControls
  loader: Loader
}

export class World {
  private scene: Scene
  private camera: PerspectiveCamera

  private emitter: Emitter
  private orbitControls: OrbitControls
  private player: Player
  private environment: Meeting
  private loader: Loader

  constructor({ scene, camera, emitter, orbitControls, loader }: WorldOptions) {
    this.scene = scene
    this.camera = camera
    this.orbitControls = orbitControls
    this.emitter = emitter
    this.loader = loader

    this.player = new Player({
      scene: this.scene,
      camera: this.camera,
      orbitControls: this.orbitControls,
      loader: this.loader,
      emitter: this.emitter
    })
    this.environment = new Meeting({
      scene: this.scene,
      loader: this.loader,
      emitter: this.emitter
    })
  }

  update(delta: number) {
    this.player.update(delta)
    this.environment.update(delta)
  }
}