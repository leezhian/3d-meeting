/*
 * @Author: kim
 * @Date: 2023-10-30 21:42:41
 * @Description: (暂时改用core)
 */
import * as THREE from 'three'
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

class WebGLManager {
  private canvas: HTMLCanvasElement | null
  private renderer: THREE.WebGLRenderer | null
  private mainScene: THREE.Scene | null
  private camera?: THREE.PerspectiveCamera | null
  private frameSize
  constructor(canvas: HTMLCanvasElement) {
    this.frameSize = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas as HTMLCanvasElement
    })
    this.mainScene = new THREE.Scene()
    this.init()
  }
  
  getRenderer() {
    return this.renderer
  }

  getCanvas() {
    return this.canvas
  }

  private init() {
    if(!this.renderer) return
    this.renderer.setSize(this.frameSize.width, this.frameSize.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.camera = new THREE.PerspectiveCamera(75, this.frameSize.width / this.frameSize.height)
    this.camera.position.z = 3

    this.bindBasicEvents()
    this.tick()
  }

  private resizeHander() {
    if(!this.renderer) return
    this.frameSize.width = window.innerWidth
    this.frameSize.height = window.innerHeight

    this.renderer.setSize(this.frameSize.width, this.frameSize.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  private tick() {
    if(this.renderer && this.mainScene && this.camera) {
      this.renderer.render(this.mainScene, this.camera)
    }
    requestAnimationFrame(this.tick)
  }

  private bindBasicEvents() {
    window.addEventListener('resize', this.resizeHander)
  }

  private unbindBasicEvents() {
    window.removeEventListener('resize', this.resizeHander)
  }

  destory() {
    this.unbindBasicEvents()
    this.renderer = null
    this.canvas = null
  }
}

export default WebGLManager