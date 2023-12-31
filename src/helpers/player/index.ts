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
import { ON_KEY_DOWN, ON_KEY_UP, ON_PLAYER_ACTION } from '@/helpers/constants'

export interface PlayerParams {
  gravity?: number
  jumpHeight?: number
  speed?: number
  initialPosition?: Vector3
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
  gravity: 2.5,
  jumpHeight: 1,
  initialPosition: new Vector3(-6.8, 0, 11.4)
}

// 胶囊体参数
const capsuleParams: [Vector3, Vector3, number] = [new Vector3(0, 0.3, 0), new Vector3(0, 1.45, 0), 0.3]

export class Player {
  private scene: Scene
  private camera: PerspectiveCamera
  private orbitControls: OrbitControls
  private control: Control
  private loader: Loader
  private emitter: Emitter
  private animationControl: AnimationControl

  private playerOnFloor = true
  private gravity: number // 重力
  private jumpHeight: number // 跳跃高度
  private speed: number // 移动速度
  private velocity = new Vector3()
  private character!: Group<Object3DEventMap>
  private forceAction: string = '' // 玩家的强制动作（玩家主动触发）
  private currentAction: string = 'idle' // 玩家当前动作
  private jumping = false
  private playerCapsule!: Capsule
  private initialPositin!: Vector3 // 初始位置
  private capsuleDiffToPlayer = new Vector3(0, capsuleParams[0].y, 0) // 胶囊体与玩家模型的位置差值
  // private cameraRaycaster: Raycaster = new Raycaster()

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
    this.initialPositin = options.initialPosition!

    this.load()
    this.emitter.on(ON_KEY_UP, this.onKeyUp.bind(this))
    this.emitter.on(ON_KEY_DOWN, this.onKeyDown.bind(this))
    this.emitter.on(ON_PLAYER_ACTION, this.onPlayerAction.bind(this))
  }

  /**
   * @description: 加载玩家模型
   * @return {void}
   */
  private async load() {
    const player = await this.loader.fbxLoader.loadAsync('/modals/girl.fbx')
    player.castShadow = true
    player.scale.set(0.01, 0.01, 0.01)
    this.playerCapsule = new Capsule(...capsuleParams)
    // this.playerCapsule.translate(this.initialPositin)
    // player.position.copy(this.playerCapsule.start.clone().sub(new Vector3(0, 0.3, 0)))
    this.reset(player)
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

  /**
   * @description: 玩家控制
   * @param {number} delta
   * @return {void}
   */  
  private playerControl(delta: number) {
    if (Object.keys(this.control.keyState).filter(n => n !== 'Space').every(n => !this.control.keyState[n])) return

    let forword = 0 // 0 代表没有前后 1表示前 -1表示后
    let side = 0
    const speed = delta * this.speed
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
      this.velocity.z -= speed * forword
    }

    if (side) {
      this.velocity.x += speed * side
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
    let damping = Math.exp(-4 * delta) - 1 // 模拟阻尼
    if (!this.playerOnFloor) {
      this.velocity.y -= this.gravity * delta
      damping *= 0.1
    }
    this.velocity.addScaledVector(this.velocity, damping)

    this.playerControl(delta) // 处理玩家操作
    this.playerCapsule.translate(this.velocity)

    this.playerCollision(octree) // 碰撞检测

    const diff = new Vector3()
    diff.subVectors(this.camera.position, this.character.position) // 计算相机与人物的向量差
    this.character.position.copy(this.playerCapsule.start.clone().sub(this.capsuleDiffToPlayer))
    this.camera.position.copy(diff.add(this.character.position))
    this.orbitControls.target = this.playerCapsule.end
    // this.cameraCollision([bvh])
    this.velocity.set(0, 0, 0)

    if(this.forceAction !== '') return
    let nextAction: string
    if(this.jumping) {
      nextAction = 'jump'
    } else if (this.control.keyState['KeyW'] || this.control.keyState['KeyS'] || this.control.keyState['KeyA'] || this.control.keyState['KeyD']) {
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
      this.playerOnFloor = result.normal.y >= 0
      this.jumping = this.playerOnFloor ? false : this.jumping
      if (!this.playerOnFloor) {
        // normal 是碰撞的单位方向向量
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
  // private cameraCollision(bvh: Object3D[]) {
  //   const ray_direction = new Vector3()
  //   ray_direction.subVectors(this.camera.position, this.character.position).normalize();
  //   // 设置镜头光线
  //   this.cameraRaycaster.set(this.character.position, ray_direction);
  //   const intersects = this.cameraRaycaster.intersectObjects(bvh);
  //   if (intersects.length) {
  //     // 找到碰撞点后还需要往前偏移一点，不然还是可能会看到穿模
  //     const offset = new Vector3() // 定义一个向前移动的偏移量
  //     offset.copy(ray_direction).multiplyScalar(-0.5) // 计算偏移量，这里的distance是想要向前移动的距离
  //     const new_position = new Vector3().addVectors(intersects[0].point, offset) // 计算新的相机位置
  //     this.camera.position.copy(new_position)
  //   }
  // }

  /**
   * @description: 按钮放开
   * @return {void}
   */
  private onKeyUp() {
    // if (Object.values(this.control.keyState).every((b) => !b)) {
    //   this.animationControl.startAnimation(this.character, 'idle')
    // }
  }

  private onKeyDown([keyCode]: string[]) {
    this.forceAction = ''
    if (keyCode === 'Space') {
      this.jump()
    }
  }

  /**
   * @description: 跳跃
   * @return {void}
   */
  private jump() {
    if (this.playerOnFloor) {
      this.jumping = true
      this.velocity.y = this.jumpHeight
    }
  }

  private onPlayerAction(action: string) {
    this.currentAction = action
    this.forceAction = action
    
    this.animationControl.startAnimation(this.character, action, false)
    function handleFinshed(this: Player) {
      this.animationControl.mixer?.removeEventListener('finished', handleFinshed)
      this.animationControl.startAnimation(this.character, 'idle')
    }
  
    this.animationControl.mixer?.addEventListener('finished', handleFinshed.bind(this))
  }

  /**
   * @description: 重置玩家位置
   * @param {Object3D} player
   * @return {void}
   */  
  reset(player: Object3D) {
    this.playerCapsule.set(...capsuleParams)
    this.playerCapsule.translate(this.initialPositin)
    
    player.position.copy(this.playerCapsule.start.clone().sub(this.capsuleDiffToPlayer))
    player.rotation.y = Math.PI / 2
    this.camera.position.set(-4, 1.6, 11.4)
    this.camera.updateProjectionMatrix()
    this.orbitControls.target = this.playerCapsule.end

    this.orbitControls.minDistance = 1
    this.orbitControls.maxDistance = 5
    // remark 后期应交由 camera 碰撞处理
    this.orbitControls.maxPolarAngle = Math.PI / 2
  }

  /**
   * @description: 更新函数
   * @param {number} delta
   * @return {void}
   */
  update(delta: number, octree: Octree) {
    if (!this.character || !octree) return
    this.updatePlayer(delta, octree)
    this.animationControl.mixer?.update(delta)
  }
}