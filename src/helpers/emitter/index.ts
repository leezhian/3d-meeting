/*
 * @Author: kim
 * @Date: 2023-11-06 21:55:29
 * @Description: 事件分发
 */
import mitt from 'mitt'

export class Emitter {
  private emitter

  constructor() {
    this.emitter = mitt()
  }

  /**
   * @description: 注册事件
   * @param {string} event
   * @param {function} handler
   * @return {void}
   */  
  on(event: string, handler: (...args: any[]) => void) {
    this.emitter.on(event, handler)
  }

  /**
   * @description: 分发事件
   * @param {string} event
   * @return {void}
   */  
  emit(event: string, ...args: any[]) {
    this.emitter.emit(event, args)
  }

  /**
   * @description: 移除注册事件
   * @param {string} event
   * @return {void}
   */  
  off(event: string, handler?: (...args: any[]) => void) {
    this.emitter.off(event, handler)
  }

  /**
   * @description: 清理所有注册事件
   * @return {void}
   */  
  clear() {
    this.emitter.all.clear()
  }
}