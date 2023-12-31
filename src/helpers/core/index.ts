/*
 * @Author: kim
 * @Date: 2023-11-06 19:10:29
 * @Description: 基础核心类
 */
import { Scene, Clock, WebGLRenderer, PerspectiveCamera, Color, VSMShadowMap, SRGBColorSpace, ACESFilmicToneMapping } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Emitter } from '@/helpers/emitter'
import { World } from '@/helpers/world'
import { Control } from '@/helpers/control'
import { Loader } from '@/helpers/loader'

export interface deviceInfo {
  width: number
  height: number
  pixelRatio: number
}

export class Core {
  static deviceInfo: deviceInfo
  scene: Scene
  renderer: WebGLRenderer
  camera: PerspectiveCamera
  orbitControls: OrbitControls
  clock: Clock

  emitter: Emitter
  world: World
  control: Control
  loader: Loader

  constructor() {
    Core.deviceInfo = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio, 2)
    }
    this.scene = new Scene()
    this.renderer = new WebGLRenderer()
    this.camera = new PerspectiveCamera()
    this.clock = new Clock()
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement)
    this.orbitControls.enableDamping = true

    this.emitter = new Emitter()
    this.initScene()
    this.initCamera()
    this.initRenderer()
    this.bindEvents()

    this.control = new Control({
      emitter: this.emitter
    })
    this.loader = new Loader({
      emitter: this.emitter
    })
    this.world = new World({
      scene: this.scene,
      camera: this.camera,
      emitter: this.emitter,
      loader: this.loader,
      orbitControls: this.orbitControls,
      control: this.control
    })
  }

  /**
   * @description: 获取canvas信息
   * @return {deviceInfo}
   */  
  // getCanvasRect() {
  //   return this.deviceInfo
  // }

  /**
   * @description: 初始话场景
   * @return {void}
   */  
  initScene() {
    this.scene.background = new Color(0x000000)
  }

  /**
   * @description: 初始化相机
   * @return {void}
   */  
  initCamera() {
    this.camera.fov = 75
    this.camera.aspect = Core.deviceInfo.width / Core.deviceInfo.height
    this.camera.updateProjectionMatrix()
  }

  /**
   * @description: 初始话画布
   * @return {void}
   */  
  initRenderer() {
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = VSMShadowMap
    this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.setSize(Core.deviceInfo.width, Core.deviceInfo.height)
    this.renderer.setPixelRatio(Core.deviceInfo.pixelRatio)
    document.querySelector('#app')?.appendChild(this.renderer.domElement)
  }

  render() {
    this.renderer.setAnimationLoop(() => {
      const deltaTime = Math.min(0.05, this.clock.getDelta())
      this.world.update(deltaTime)
      this.renderer.render(this.scene, this.camera)
      this.orbitControls.update()
    })
  }

  /**
   * @description: 浏览器大小改变处理
   * @return {void}
   */  
  private resizeHander() {
    Core.deviceInfo.width = window.innerWidth
    Core.deviceInfo.height = window.innerHeight
    Core.deviceInfo.pixelRatio = Math.min(window.devicePixelRatio, 2)
    
    this.camera.aspect = Core.deviceInfo.width / Core.deviceInfo.height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(Core.deviceInfo.width, Core.deviceInfo.height)
    this.renderer?.setPixelRatio(Core.deviceInfo.pixelRatio)

    this.emitter.emit('resize', Core.deviceInfo)
  }

  private bindEvents() {
    window.addEventListener('resize', this.resizeHander.bind(this))
  }

  private unbindEvents() {
    window.removeEventListener('resize', this.resizeHander.bind(this))
  }

  /**
   * @description: 销毁（用于解绑全局事件）
   * @return {void}
   */  
  destory() {
    this.control.destory()
    this.world.destory()
    this.emitter.clear()
    this.unbindEvents()
  }
}