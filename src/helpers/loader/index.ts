/*
 * @Author: kim
 * @Date: 2023-11-07 00:29:08
 * @Description: 加载器
 */
import { DefaultLoadingManager } from 'three'
import { Emitter } from '@/helpers/emitter'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { ON_GLOBAL_LOAD_PROGRESS } from '@/helpers/constants'

export interface LoaderOptions {
  emitter: Emitter
}

export class Loader {
  private emitter: Emitter
  gltfLoader: GLTFLoader
  fbxLoader: FBXLoader

  constructor({ emitter }: LoaderOptions) {
    this.emitter = emitter

    this.gltfLoader = new GLTFLoader()
    this.fbxLoader = new FBXLoader()

    // 默认加载器
    DefaultLoadingManager.onProgress = (url, loaded, total) => {
      this.emitter.emit(ON_GLOBAL_LOAD_PROGRESS, { url, loaded, total })
    }
  }
}