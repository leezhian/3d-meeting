/*
* @Author: kim
* @Date: 2023-11-06 23:00:38
* @Description: 玩家
*/
import { PerspectiveCamera, Scene, Vector3, Group, Object3DEventMap, Object3D } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Capsule } from 'three/examples/jsm/math/Capsule.js'
import { Octree } from 'three/examples/jsm/math/Octree.js'
import { AnimationControl } from '@/helpers/animation-control'
import type { Loader } from '@/helpers/loader'
import type { Emitter } from '@/helpers/emitter'
import type { Control } from '@/helpers/control'
import { ON_KEY_UP } from '@/helpers/constants'

export interface PlayerParams {
  gravity?: number
  jumpHeight?: number
  speed?: number
}

export interface PlayerOptions extends PlayerParams {
  scene: Scene
  camera: PerspectiveCamera
  orbitControls: OrbitControls
  control: Control
  loader: Loader
  emitter: Emitter
}

const defaultParams: PlayerParams = {
  speed: 4,
  gravity: 30,
  jumpHeight: 12
}

export class Player {
  private scene: Scene
  private camera: PerspectiveCamera
  private orbitControls: OrbitControls
  private control: Control
  private loader: Loader
  private emitter: Emitter
  private animationControl: AnimationControl

  private playerOnFloor = false
  private gravity: number // 重力
  private jumpHeight: number // 跳跃高度
  private speed: number // 移动速度
  private velocity = new Vector3()
  private character!: Group<Object3DEventMap>
  private currentAction: string = 'idle'
  private playerCapsule!: Capsule

  constructor(options: PlayerOptions) {
    Object.assign(options, defaultParams)
    this.scene = options.scene
    this.camera = options.camera
    this.orbitControls = options.orbitControls
    this.control = options.control
    this.loader = options.loader
    this.emitter = options.emitter
    this.animationControl = new AnimationControl('/animations/')

    this.gravity = options.gravity!
    this.jumpHeight = options.jumpHeight!
    this.speed = options.speed!

    this.load()
    this.emitter.on(ON_KEY_UP, this.onKeyUp.bind(this))
  }

  /**
   * @description: 加载玩家模型
   * @return {void}
   */
  private async load() {
    const player = await this.loader.fbxLoader.loadAsync('/modals/girl.fbx')
    player.scale.set(0.01, 0.01, 0.01)
    this.playerCapsule = new Capsule(new Vector3(0, 0.3, 0),
      new Vector3(0, 1.45, 0),
      0.3,)
    this.playerCapsule.translate(new Vector3(0, 0, 6))
    player.position.copy(this.playerCapsule.start)
    this.character = player

    // 加载动画
    await this.animationControl.load({
      idle: 'idle.fbx',
      running: 'running.fbx',
      jump: 'jump.fbx',
      sitting: 'sitting.fbx',
      waving: 'waving.fbx',
      dancing: 'dancing.fbx'
    })
    this.animationControl.startAnimation(player, this.currentAction)

    player.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true
      }
    })

    this.scene.add(player)
  }

  private playerControl() {
    if (Object.values(this.control.keyState).every((b) => !b)) return

    let forword = 0 // 0 代表没有前后 1表示前 -1表示后
    let side = 0
    for (let code in this.control.keyState) {
      if (!this.control.keyState[code]) continue
      switch (code) {
        case 'KeyW':
          forword += 1
          break
        case 'KeyS':
          forword -= 1
          break
        case 'KeyA':
          side -= 1
          break
        case 'KeyD':
          side += 1
          break
      }
    }

    const controlRotationAngle = this.orbitControls.getAzimuthalAngle()
    // 计算旋转角度
    // remark: 因为相机与人物向前朝向永远差 PI 的弧度（可以理解为为了向前时相机总看到人物背面，因此旋转了PI弧度）
    const playRotateRelativeToCamera =
      ((forword <= 0 ? 0 : Math.PI * (side ? side : 1)) +
        (Math.PI * side) / 2) /
      (forword && side ? 2 : 1)
    this.character.rotation.y = controlRotationAngle + playRotateRelativeToCamera

    if (forword) {
      this.velocity.z -= forword
    }

    if (side) {
      this.velocity.x += side
    }

    this.velocity.applyAxisAngle(
      Object3D.DEFAULT_UP,
      controlRotationAngle,
    )
  }

  /**
   * @description: 更新玩家状态
   * @param {number} delta
   * @param {Octree} octree
   * @return {void}
   */
  private updatePlayer(delta: number, octree: Octree) {
    // 处理人物下落
    let damping = Math.exp(-4 * delta) - 1
    if (!this.playerOnFloor) {
      this.velocity.y -= this.gravity * delta
      damping *= 0.1
    }
    this.velocity.addScaledVector(this.velocity, damping)

    this.playerControl() // 处理玩家操作
    this.playerCapsule.translate(this.velocity.normalize().multiplyScalar(delta * this.speed))
    this.playerCollision(octree) // 碰撞检测

    const diff = new Vector3()
    diff.subVectors(this.camera.position, this.character.position) // 计算相机与人物的向量差
    this.character.position.copy(this.playerCapsule.start.clone().sub(new Vector3(0, 0.3, 0)))
    this.camera.position.copy(diff.add(this.character.position))
    this.orbitControls.target = this.playerCapsule.end
    this.velocity.set(0, 0, 0)

    let nextAction: string
    if (this.control.keyState['KeyW'] || this.control.keyState['KeyS'] || this.control.keyState['KeyA'] || this.control.keyState['KeyD']) {
      nextAction = 'running'
    } else {
      nextAction = 'idle'
    }

    if (this.currentAction !== nextAction) {
      this.animationControl.startAnimation(this.character, nextAction)
      this.currentAction = nextAction
    }
  }

  /**
   * @description: 玩家碰撞检测
   * @param {Octree} octree
   * @return {void}
   */
  private playerCollision(octree: Octree) {
    const result = octree.capsuleIntersect(this.playerCapsule)
    this.playerOnFloor = false
    if (result) {
      this.playerOnFloor = result.normal.y > 0
      if (!this.playerOnFloor) {
        this.velocity.addScaledVector(
          result.normal,
          -result.normal.dot(this.velocity),
        )
      }
      this.playerCapsule.translate(result.normal.multiplyScalar(result.depth))
    }
  }

  /**
   * @description: 相机碰撞处理
   * @return {void}
   */  
  private cameraCollision() {

  }

  /**
   * @description: 按钮放开
   * @return {void}
   */
  private onKeyUp() {
    if (Object.values(this.control.keyState).every((b) => !b) && this.currentAction !== 'idle') {
      this.currentAction = 'idle'
      this.animationControl.startAnimation(this.character, this.currentAction)
    }
  }

  /**
   * @description: 更新函数
   * @param {number} delta
   * @return {void}
   */
  update(delta: number, octree: Octree) {
    if (!this.character) return
    this.updatePlayer(delta, octree)
    this.animationControl.mixer?.update(delta)
  }
}