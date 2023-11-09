/*
 * @Author: kim
 * @Date: 2023-11-06 23:01:04
 * @Description: 会议场景
 */
import { Scene, AmbientLight, DirectionalLight, Object3D, Mesh, MeshStandardMaterial, VideoTexture, BufferGeometry, PerspectiveCamera, Vector2, Raycaster, type NormalBufferAttributes, PlaneGeometry, Group, Color, Vector3, Shape, ShapeGeometry, TextureLoader, MeshBasicMaterial, RepeatWrapping } from 'three'
import { Octree } from 'three/examples/jsm/math/Octree.js'
import { MeshBVH, StaticGeometryGenerator, type MeshBVHOptions } from 'three-mesh-bvh'
import { Core } from '@/helpers/core'
import type { Emitter } from '@/helpers/emitter'
import type { Loader } from '@/helpers/loader'
import { AnimationControl } from '@/helpers/animation-control'

export interface MeetingOptions {
  scene: Scene
  emitter: Emitter
  loader: Loader
  camera: PerspectiveCamera
}

const MinusReg = /^minus$/i
const PlusReg = /^plus$/i

export class Meeting {
  private scene: Scene
  private emitter: Emitter
  private loader: Loader
  private camera: PerspectiveCamera
  private animationControl: AnimationControl
  private video?: HTMLVideoElement
  octree: Octree
  bvh?: Mesh
  loaded = false
  private mouse = new Vector2() // 鼠标
  private mouseRaycaster = new Raycaster()

  private screen?: Mesh
  private videoMinusControl?: Mesh<PlaneGeometry, MeshStandardMaterial> // 减少音量
  private videoPlusControl?: Mesh<ShapeGeometry, MeshStandardMaterial> // 加大音量
  private videoControl?: Group // 视频控件

  constructor({ scene, emitter, loader, camera }: MeetingOptions) {
    this.scene = scene
    this.emitter = emitter
    this.camera = camera
    this.loader = loader
    this.octree = new Octree()
    this.animationControl = new AnimationControl()

    this.load()
    this.bindEvents()
  }

  private async load() {
    await this.loadScene()
    this.initSceneOtherEffects()
    // TODO 通知加载完毕
    this.loaded = true
  }

  private async loadScene() {
    try {
      const gltf = await this.loader.gltfLoader.loadAsync('/modals/meeting.glb')

      // 开启阴影
      gltf.scene.traverse(child => {
        if ((child as Mesh).isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }

        if (child.name === 'screen') {
          this.initScreen(child)
          this.screen = child as Mesh
          this.createVideoControl()
        } else if (child.name === 'navmesh_booleans_applied') {
          const floor = child as Mesh<PlaneGeometry, MeshBasicMaterial>
          floor.material.color.set(0xA8A69D)
          const floorTexture = new TextureLoader().load('/texture/1meeting_floor.png')
          floorTexture.wrapS = RepeatWrapping;
          floorTexture.wrapT = RepeatWrapping
          floorTexture.repeat.set(30, 30)
          floor.material.map = floorTexture
        }
      })

      this.scene.add(gltf.scene)
      // 构建八叉树
      this.octree.fromGraphNode(gltf.scene)

      // 构建 bvh(后面与八叉树二选一)
      const staticGenerator = new StaticGeometryGenerator(this.scene)
      staticGenerator.attributes = ['position']
      const generateGeometry = staticGenerator.generate() as BufferGeometry<NormalBufferAttributes> & { boundsTree: MeshBVH }
      generateGeometry.boundsTree = new MeshBVH(generateGeometry, { lazyGeneration: false } as MeshBVHOptions)
      this.bvh = new Mesh(generateGeometry)

      this.animationControl.analyse(gltf.animations)
      this.animationControl.startAnimation(gltf.scene, ['Fan', 'vaccuum_move', 'mediaFrames-bob', 'blackPanel.001Action', 'blackPanel.002Action', 'blackPanel.003Action'])
    } catch (error) {
      console.error('场景初始化出错：', error)
    }
  }

  /**
   * @description: 初始化场景其他元素
   * @return {void}
   */
  private initSceneOtherEffects() {
    const ambientLight = new AmbientLight(0xffffff)
    const directionalLight = new DirectionalLight(0xffc766, 0.2)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.set(1024, 1024)
    directionalLight.shadow.camera.far = 15
    directionalLight.position.set(-8, 6, 0)
    this.scene.add(ambientLight, directionalLight)
  }

  /**
   * @description: 初始化屏幕
   * @param {Object3D} target
   * @return {void}
   */
  private initScreen(target: Object3D) {
    const videoMesh = target.children[0] as Mesh
    this.video = this.createVideo('https://stream7.iqilu.com/10339/article/202002/18/2fca1c77730e54c7b500573c2437003f.mp4')
    const texture = new VideoTexture(this.video)
    const videoMaterial = new MeshStandardMaterial({
      map: texture
    })
    videoMesh.material = videoMaterial
    videoMesh.scale.z = -1
  }

  /**
   * @description: 创建视频
   * @param {string} url
   * @return {HTMLVideoElement}
   */
  private createVideo(url: string) {
    const video = document.createElement('video')
    video.src = url
    video.volume = 0
    video.loop = true
    video.crossOrigin = 'anonymous'
    return video
  }

  /**
   * @description: 创建视频控制器
   * @return {void}
   */
  private createVideoControl() {
    const w = 0.4
    const h = 0.1
    const color = new Color(0xDCDCDC)
    // 横
    function createHPlane() {
      return new Mesh(
        new PlaneGeometry(w, h),
        new MeshStandardMaterial({
          color
        })
      )
    }

    // 竖
    function createVPlane() {
      return new Mesh(
        new PlaneGeometry(h, w),
        new MeshStandardMaterial({
          color
        })
      )
    }

    // 加号
    function createPlus() {
      const plusShape = new Shape()
      const halfW = w / 2
      const halfH = h / 2
      plusShape.moveTo(-halfW, halfH)
      plusShape.lineTo(-halfH, halfH)
      plusShape.lineTo(-halfH, halfW)
      plusShape.lineTo(halfH, halfW)
      plusShape.lineTo(halfH, halfH)
      plusShape.lineTo(halfW, halfH)
      plusShape.lineTo(halfW, -halfH)
      plusShape.lineTo(halfH, -halfH)
      plusShape.lineTo(halfH, -halfW)
      plusShape.lineTo(-halfH, -halfW)
      plusShape.lineTo(-halfH, -halfH)
      plusShape.lineTo(-halfW, -halfH)

      return new Mesh(
        new ShapeGeometry(plusShape),
        new MeshStandardMaterial({
          color
        })
      )
    }

    this.videoControl = new Group()
    this.videoMinusControl = createHPlane()
    this.videoMinusControl.position.set(-1.2, 0, 0)
    this.videoMinusControl.name = 'minus'
    this.videoControl.add(this.videoMinusControl)
    for (let index = 0; index < 5; index++) {
      const p = createVPlane()
      p.position.set((index - 2) * 0.3, 0, 0)
      this.videoControl.add(p)
    }

    this.videoPlusControl = createPlus()
    this.videoPlusControl.name = 'plus'
    this.videoPlusControl.position.set(1.2, 0, 0)
    this.videoControl.add(this.videoPlusControl)
    this.videoControl.position.add(new Vector3(0, 2, -8.4))
    this.scene.add(this.videoControl)
  }

  /**
   * @description: 播放视频
   * @return {void}
   */
  playVideo() {
    this.video?.play()
  }

  /**
   * @description: 暂停视频
   * @return {void}
   */
  pauseVideo() {
    this.video?.pause()
  }

  private bindEvents() {
    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('click', this.onClick.bind(this))
  }

  private unbindEvents() {
    window.removeEventListener('mousemove', this.onMouseMove.bind(this))
    window.removeEventListener('click', this.onClick.bind(this))
  }

  private onMouseMove(event: MouseEvent) {
    this.mouse.x = (event.clientX / Core.deviceInfo.width) * 2 - 1
    this.mouse.y = -(event.clientY / Core.deviceInfo.height) * 2 + 1
  }

  private onClick() {
    if (!this.videoControl || !this.video) return
    // 音量调节
    const intersects = this.mouseRaycaster.intersectObjects([this.videoMinusControl!, this.videoPlusControl!])

    if (!intersects.length) return
    // 处理视频控件点击
    const o = intersects[0].object
    let volume = this.video.volume
    if (/minus/i.test(o.name)) {
      volume = Math.max((this.video?.volume ?? 0) - 0.2, 0)
    } else if (/plus/i.test(o.name)) {
      volume = Math.min((this.video?.volume ?? 0) + 0.2, 1)
    }

    if(volume === this.video.volume) return
    this.video.volume = volume
    const endIndex = volume / 0.2
    let index = 1
    this.videoControl.traverse(child => {
      if ((child as Mesh).isMesh && !MinusReg.test(child.name) && !PlusReg.test(child.name)) {
        (child as Mesh<PlaneGeometry, MeshStandardMaterial>).material.color.set(index <= endIndex ? 0x666666 : 0xDCDCDC)
        index++
      }
    })
  }

  /**
   * @description: 鼠标捕捉
   * @return {void}
   */
  private mouseCatch() {
    if (!this.screen || !this.videoControl) return
    if (this.mouse.x && this.mouse.y) {
      this.mouseRaycaster.setFromCamera(this.mouse, this.camera)
    }

    const intersects = this.mouseRaycaster.intersectObjects([this.screen, this.videoMinusControl!, this.videoPlusControl!])
    if (intersects.length) {
      // 处理控件 hover
      this.videoControl.visible = true
      this.videoMinusControl!.material.color.set(0xDCDCDC)
      this.videoPlusControl!.material.color.set(0xDCDCDC)
      intersects.forEach(item => {
        if (MinusReg.test(item.object.name)) {
          this.videoMinusControl!.material.color.set(0x666666)
        } else if (PlusReg.test(item.object.name)) {
          this.videoPlusControl!.material.color.set(0x666666)
        }
      })
    } else {
      this.videoControl.visible = false
    }

  }

  update(delta: number) {
    this.animationControl.mixer?.update(delta)
    this.mouseCatch()
  }

  destory() {
    this.unbindEvents()
  }
}