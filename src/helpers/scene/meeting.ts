/*
 * @Author: kim
 * @Date: 2023-11-06 23:01:04
 * @Description: 会议场景
 */
import { Scene, AmbientLight, DirectionalLight, Object3D, Mesh, MeshStandardMaterial, VideoTexture, BufferGeometry, type NormalBufferAttributes } from 'three'
import { Octree } from 'three/examples/jsm/math/Octree.js'
import { MeshBVH, StaticGeometryGenerator, type MeshBVHOptions } from 'three-mesh-bvh'
import type { Emitter } from '@/helpers/emitter'
import { Loader } from '@/helpers/loader'
import { AnimationControl } from '@/helpers/animation-control'

export interface MeetingOptions {
  scene: Scene
  emitter: Emitter
  loader: Loader
}

export class Meeting {
  private scene: Scene
  private emitter: Emitter
  private loader: Loader
  private animationControl: AnimationControl
  private video?: HTMLVideoElement
  octree: Octree
  bvh?: Mesh
  loaded = false

  constructor({ scene, emitter, loader }: MeetingOptions) {
    this.scene = scene
    this.emitter = emitter
    this.loader = loader
    this.octree = new Octree()
    this.animationControl = new AnimationControl()

    this.load()
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
    video.muted = true
    video.loop = true
    video.crossOrigin = 'anonymous'
    return video
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

  update(delta: number) {
    this.animationControl.mixer?.update(delta)
  }
}