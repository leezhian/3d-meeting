/*
 * @Author: kim
 * @Date: 2023-11-06 23:46:09
 * @Description: 控制类
 */
import type { Emitter } from '@/helpers/emitter'
import { ON_KEY_DOWN, ON_KEY_UP } from '@/helpers/constants'

export interface ControlOptions {
  emitter: Emitter
}

export class Control {
  private emitter: Emitter
  keyState: Record<string, boolean> = {
    "KeyW": false,
		"KeyS": false,
		"KeyA": false,
		"KeyD": false,
		"Space": false
  }
  isEnable = false // 是否允许控制

  constructor({ emitter }: ControlOptions) {
    this.emitter = emitter
    this.bindEvent()
  }

  private bindEvent() {
    document.addEventListener('keydown', this.onKeyDown.bind(this))
    document.addEventListener('keyup', this.onKeyUp.bind(this))
  }

  private unbindEvent() {
    document.removeEventListener('keydown', this.onKeyDown.bind(this))
    document.removeEventListener('keyup', this.onKeyUp.bind(this))
  }

  /**
   * @description: 按下处理
   * @param {KeyboardEvent} event
   * @return {*}
   */  
  onKeyDown(event: KeyboardEvent) {
    if(this.isAllowKey(event.code) && this.isEnable) {
      this.keyState[event.code] = true
      this.emitter.emit(ON_KEY_DOWN, event.code)
    }
  }

  /**
   * @description: 释放处理
   * @param {KeyboardEvent} event
   * @return {*}
   */  
  onKeyUp(event: KeyboardEvent) {
    if(this.isAllowKey(event.code) && this.isEnable) {
      this.keyState[event.code] = false
      this.emitter.emit(ON_KEY_UP, event.code)
    }
  }

  /**
   * @description: 是否允许的按键
   * @param {string} key
   * @return {boolean}
   */  
  isAllowKey(key: string) {
    return Object.keys(this.keyState).includes(key)
  }

  /**
   * @description: 启动控制器
   * @return {void}
   */ 
  enabled() {
    this.isEnable = true
  }

  /**
   * @description: 禁止控制器
   * @return {void}
   */  
  disabled() {
    this.isEnable = false
  }

  /**
   * @description: 销毁控制器
   * @return {void}
   */  
  destory() {
    this.unbindEvent()
  }
}