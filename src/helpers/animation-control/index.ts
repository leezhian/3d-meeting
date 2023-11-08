/*
 * @Author: kim
 * @Date: 2023-11-06 14:32:18
 * @Description: 动画控制
 */
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

export class AnimationControl {
  private fpxLoader: FBXLoader
  animations: Record<string, THREE.AnimationClip>
  mixer?: THREE.AnimationMixer

  constructor(path?: string) {
    this.animations = {}
    this.fpxLoader = new FBXLoader()
    if (path) {
      this.fpxLoader.setPath(path)
    }
  }

  /**
   * @description: 加载动画（同名会发生覆盖）
   * @param {Record} options 键值对（动画名：动画地址）
   * @return {promise}
   */
  async load(options: Record<string, string>) {
    for (const key in options) {
      try {
        this.animations[key] = (await this.fpxLoader.loadAsync(options[key])).animations[0]
      } catch (error) {
        console.error(key, error)
      }
    }
  }

  /**
   * @description: 分析动画组
   * @param {THREE.AnimationClip[]} group 动画组
   * @return {void}
   */  
  analyse(group: THREE.AnimationClip[]) {
    Object.assign(this.animations, group.reduce<Record<string, THREE.AnimationClip>>((anims, item) => {
      anims[item.name] = item
      return anims
    }, {}))
  }

  /**
   * @description: 是否存在某个动画
   * @param {string} name 动画名
   * @return {boolean}
   */
  isExistAnimation(name: string) {
    return !!this.animations[name]
  }

  /**
   * @description: 播放动画
   * @param {THREE} target 目标对象
   * @param {string|string[]} name 动画名字，允许传入多个动画
   * @param {boolean} loop 可选， 是否重播，默认 true
   * @return {THREE.AnimationMixer}
   */
  startAnimation(target: THREE.Object3D, name: string | string[], loop = true) {
    let animationNames = []
    if (typeof name === 'string') {
      animationNames.push(name)
    } else {
      animationNames = name
    }
    
    this.mixer = new THREE.AnimationMixer(target)
    animationNames.forEach((animName) => {
      if (!this.isExistAnimation(animName)) {
        console.warn(`Animation ${animName} is not exist`)
        return
      }

      const animationAction = (this.mixer as THREE.AnimationMixer).clipAction(this.animations[animName])
      animationAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
      animationAction.play().fadeIn(0.1)
    })

    return this.mixer
  }
}