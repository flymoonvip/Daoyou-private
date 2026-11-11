/* eslint-disable */
// @ts-nocheck
// Vendored from the trading-site repo (src/shared/utils/spine). Keep logic identical.

/**
 * 共享 Spine 渲染器（PixiJS 版）
 * 基于 pixi.js + pixi-spine 实现，替代原 @esotericsoftware/spine-webgl 方案
 * 每个 Spine 实例使用独立的 PIXI.Application，避免 WebGL 上下文共享问题
 */

// 补丁必须在任何 pixi-spine 加载前执行
import './patch'

import * as PIXI from 'pixi.js'
import type { ITrackEntry } from 'pixi-spine'
import { Vector2 } from 'pixi-spine'
import { SpineMhy } from './SpineMhy'

/** 动画完成回调类型 */
export type AnimationCompleteCallback = (animationName: string) => void

/** 外部镜头覆盖参数，用于 CameraDirector 直接控制视口 */
export interface CameraOverride {
  centerX: number
  centerY: number
  viewWidth: number
  viewHeight: number
  vignette: number
  flash: number
  /** 运动模糊强度 0~1，由 CameraDirector 根据镜头运动速度计算 */
  motionBlur: number
  /** 运动模糊方向角度（度），0=水平右，90=垂直下 */
  motionBlurAngle: number
  /**
   * 静态构图偏移,canvas 百分比,正值右移/下移。默认 0。
   * 直接作用于 PixiJS spine.position(而非外层 DOM translate3d),
   * 让"调整 spine 在画布里的位置"与镜头脚本的 target 偏移在同一坐标系里相加,
   * 不再需要双重 transform 拼贴。配置端语义不变(SpineAnimationConfig.offsetX/Y)。
   */
  offsetX?: number
  offsetY?: number
}

export interface SpineInstanceData {
  id: string
  pixiApp: PIXI.Application
  spine: SpineMhy
  bounds: { width: number; height: number; offsetX: number; offsetY: number }
  /** PixiJS view 直接挂载的宿主容器(view 即可见 WebGL canvas,不再做每帧拷贝) */
  mountEl: HTMLElement | null
  targetWidth: number
  targetHeight: number
  scale: number
  completeCallbacks: AnimationCompleteCallback[]
  cameraOverride: CameraOverride | null
}

export interface LoadConfig {
  id: string
  jsonUrl?: string
  skelUrl?: string
  atlasUrl: string
  /**
   * 初始动画名。仅用于"无镜头脚本的静态展示"(如 banner 立绘):加载后立即播放。
   * 镜头演出(SpineReveal)不传此字段——动画完全由 cameraScript 的 playAnimation 驱动。
   * 不传 = 停在 setup pose,不擅自 fallback 播第一个动画(那是埋坑的兜底)。
   */
  animation?: string
  loop?: boolean
  scale?: number
}

class SharedSpineRendererClass {
  private instances: Map<string, SpineInstanceData> = new Map()
  /** 在途加载的 Promise,用于同一 id 的并发去重 */
  private loadingPromises: Map<string, Promise<SpineInstanceData>> = new Map()

  /**
   * 加载 Spine 资源
   */
  load(config: LoadConfig): Promise<SpineInstanceData> {
    const { id, jsonUrl, skelUrl, animation, loop = true, scale = 1 } = config

    if (!jsonUrl && !skelUrl) {
      return Promise.reject(new Error('必须提供 jsonUrl 或 skelUrl'))
    }

    const existing = this.instances.get(id)
    if (existing) {
      return Promise.resolve(existing)
    }

    // 并发去重:首个 load 尚未 resolve 时同一 id 再次进来(组件因 :key 变化快速重挂载是典型场景),
    // 必须复用同一个 Promise。否则会创建两个 PIXI.Application(两个 WebGL 上下文)抢同一份全局纹理缓存,
    // 既泄漏上下文,又会在其中一个销毁时把共享纹理带走,导致另一个读到已销毁资源而崩溃。
    const pending = this.loadingPromises.get(id)
    if (pending) return pending

    const dataUrl = (jsonUrl || skelUrl)!

    const promise = new Promise<SpineInstanceData>((resolve, reject) => {
      // resolution 固定为 1，避免高 DPR 设备（手机 DPR=3）下
      // buffer 尺寸（1920*3=5760）超出 GPU MAX_TEXTURE_SIZE 导致渲染不可见
      // Spine 动画通过 CSS 缩放显示，resolution=1 不影响视觉效果
      const pixiApp = new PIXI.Application({
        width: 1,
        height: 1,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: false,
        resolution: 1,
        preserveDrawingBuffer: true,
      })

      // pixi v6 的 loader 方式加载 spine 资源。
      //
      // 关键:通过 metadata.imageLoader 自定义 atlas 页图片的加载方式,
      // 彻底绕开 pixi-spine 默认的 imageLoaderAdapter。原因:
      // 1. 默认适配器把页图片塞进 loader.resources 并经 Texture.fromLoader 建纹理,
      //    后者用图片 URL 作键写入【全局】BaseTextureCache/TextureCache(模块级单例)。
      //    本渲染器每个实例是独立 PIXI.Application(独立 WebGL 上下文),同一张 atlas png
      //    被 banner 立绘与单抽演出同时加载时,全局缓存反复碰撞("already had an entry"),
      //    并在多页 atlas 下命中"已登记但 texture 未建成"的资源,读 .baseTexture 直接崩溃。
      // 2. 这里改用 new BaseTexture(url) ——【构造函数不写全局缓存】,纹理对本 App 私有,
      //    各实例互不干扰,也永不走那条会崩的 cachedResource 分支。crossorigin 兜底跨域贴图。
      // 收集本次创建的所有 atlas 页纹理,resolve 前等它们全部就绪,
      // 保证 getBounds 与首帧渲染发生在贴图已下载之后(默认适配器靠 loader 等待,这里要自己等)。
      const pageTextures: PIXI.BaseTexture[] = []

      const customImageLoader = (
        _loader: PIXI.Loader,
        _namePrefix: string,
        baseUrl: string,
      ) => (line: string, callback: (baseTexture: PIXI.BaseTexture | null) => void) => {
        try {
          const baseTexture = new PIXI.BaseTexture(baseUrl + line, {
            resourceOptions: { crossorigin: 'anonymous' },
          })
          pageTextures.push(baseTexture)
          callback(baseTexture)
        } catch (err) {
          console.warn(`[SharedSpineRenderer] atlas 页加载失败: ${baseUrl + line}`, err)
          callback(null)
        }
      }

      /** 等待一张 BaseTexture 就绪(已 valid 直接过,否则等 loaded;error 也放行避免卡死) */
      const waitTexture = (bt: PIXI.BaseTexture): Promise<void> =>
        new Promise((res) => {
          if (bt.valid) return res()
          bt.once('loaded', () => res())
          bt.once('error', () => res())
        })

      pixiApp.loader
        .add(id, dataUrl, { metadata: { imageLoader: customImageLoader } })
        .load(async (_loader: PIXI.Loader, resources: Partial<Record<string, PIXI.LoaderResource>>) => {
          try {
            const res = resources[id]
            if (!res || !res.spineData) {
              reject(new Error(`加载 Spine 资源失败: ${dataUrl}`))
              return
            }

            // 等所有 atlas 页贴图就绪,再算 bounds / 建 spine,避免首帧空白与尺寸为 0
            await Promise.all(pageTextures.map(waitTexture))

            // 将米哈游扩展数据挂载到 spineData 上
            const spineData = res.spineData
            const rawData = res.data as Record<string, unknown> | undefined
            // pixi-spine 的 spineData 类型不含米哈游扩展字段，需要动态挂载
            Object.assign(spineData, {
              extra: rawData?.extra || {},
              extraConfig: rawData?.extraConfig || {},
              extraSlot: rawData?.extraSlot || {},
            })

            const spine = new SpineMhy(spineData)
            spine.scale.set(scale)
            spine.autoUpdate = true

            // 仅当显式传入有效动画名时才播放(无镜头脚本的 banner 立绘场景)。
            // 关键:不再 fallback 到"第一个动画"——那个兜底会在传入不存在的动画名时
            // 静默播错,也和 cameraScript 驱动的演出意图冲突。镜头演出(SpineReveal)
            // 不传 animation,骨骼停在 setup pose,首帧由脚本的 playAnimation 接管。
            if (animation) {
              if (spineData.animations.some((a: { name: string }) => a.name === animation)) {
                spine.state.setAnimation(0, animation, loop)
              } else {
                console.warn(`[SharedSpineRenderer] 动画 "${animation}" 不存在于 ${id},已跳过初始播放`)
              }
            }

            // 计算边界
            spine.skeleton.updateWorldTransform()
            const boundsOffset = new Vector2()
            const boundsSize = new Vector2()
            // ISkeleton.getBounds 签名要求第三个参数 temp 数组，用于内部顶点计算缓存
            spine.skeleton.getBounds(boundsOffset, boundsSize, [])
            const bounds = {
              width: boundsSize.x,
              height: boundsSize.y,
              offsetX: boundsOffset.x,
              offsetY: boundsOffset.y,
            }

            const instanceData: SpineInstanceData = {
              id,
              pixiApp,
              spine,
              bounds,
              mountEl: null,
              targetWidth: 200,
              targetHeight: 300,
              scale,
              completeCallbacks: [],
              cameraOverride: null,
            }

            // 监听动画完成事件
            // ITrackEntry 接口未声明 animation 字段，但运行时实际存在，需类型断言绕过
            spine.state.addListener({
              complete: (entry) => {
                const trackEntry = entry as ITrackEntry & { animation?: { name: string } }
                const animName = trackEntry?.animation?.name
                if (animName) {
                  instanceData.completeCallbacks.forEach((cb) => cb(animName))
                }
              },
            })

            this.instances.set(id, instanceData)
            resolve(instanceData)
          } catch (e) {
            reject(e)
          }
        })
    })

    // 注册在途 Promise 供并发去重;无论成功失败都在 settle 后清掉,避免失败后永久占位
    this.loadingPromises.set(id, promise)
    const cleanup = () => this.loadingPromises.delete(id)
    promise.then(cleanup, cleanup)
    return promise
  }

  /**
   * 把 PixiJS 的 view(WebGL canvas)直接挂载到宿主容器显示。
   *
   * 关键重构:旧实现给每个 spine 建隐藏 canvas + 每帧 ctx.drawImage 全分辨率拷贝到可见 2D canvas,
   * 那是一次逐帧 GPU→CPU→2D 的回读,1920×1080 下直接吃满主线程造成掉帧。
   * 现在让 PixiJS 的 view 本身就是可见 canvas,渲染循环零拷贝直出。
   *
   * @param mountEl 宿主容器(view 会作为其子节点),渲染尺寸取该容器的真实布局尺寸
   * @param width  显式宽度(像素);<=0 时回退到容器 clientWidth
   * @param height 显式高度(像素);<=0 时回退到容器 clientHeight
   */
  bindCanvas(mountEl: HTMLElement, id: string, width = 0, height = 0): void {
    const instance = this.instances.get(id)
    if (!instance) return

    // 渲染分辨率策略:
    // - 显式传入 width/height(编辑器、镜头演出):原样作为 buffer 尺寸,保持 buffer 像素与显示像素 1:1。
    //   PreviewStage 的标记投影依赖这个 1:1 关系(getSpineTransform 返回的是 buffer 空间坐标)。
    // - 未显式传入(banner 立绘,本次性能问题的根源):读取容器真实布局尺寸并限制最长边,
    //   避免旧实现写死 1920×1080 buffer 带来的过度渲染。
    let resolvedW: number
    let resolvedH: number
    if (width > 0 && height > 0) {
      resolvedW = Math.max(1, Math.round(width))
      resolvedH = Math.max(1, Math.round(height))
    } else {
      const rawW = Math.max(1, Math.round(width > 0 ? width : mountEl.clientWidth || 0))
      const rawH = Math.max(1, Math.round(height > 0 ? height : mountEl.clientHeight || 0))
      // 限制最长边到 1920;按统一比例缩放两边以保持宽高比(单独 clamp 会拉伸画面)
      const MAX_EDGE = 1920
      const clampK = Math.min(1, MAX_EDGE / rawW, MAX_EDGE / rawH)
      resolvedW = Math.max(1, Math.round(rawW * clampK))
      resolvedH = Math.max(1, Math.round(rawH * clampK))
    }

    instance.mountEl = mountEl
    instance.targetWidth = resolvedW
    instance.targetHeight = resolvedH

    const { pixiApp, spine, bounds } = instance

    // 调整 PixiJS 渲染缓冲尺寸到真实显示尺寸
    pixiApp.renderer.resize(resolvedW, resolvedH)

    // 计算视口，让骨骼完整显示并居中
    const padding = 1.1
    const skeletonAspect = bounds.width / bounds.height
    const canvasAspect = resolvedW / resolvedH

    let viewWidth: number
    let viewHeight: number
    if (skeletonAspect > canvasAspect) {
      viewWidth = bounds.width * padding
      viewHeight = viewWidth / canvasAspect
    } else {
      viewHeight = bounds.height * padding
      viewWidth = viewHeight * canvasAspect
    }

    // 计算缩放和位置，使骨骼居中
    const scaleX = resolvedW / viewWidth
    const scaleY = resolvedH / viewHeight
    const renderScale = Math.min(scaleX, scaleY)

    const centerX = bounds.offsetX + bounds.width / 2
    const centerY = bounds.offsetY + bounds.height / 2

    // pixi-spine 默认 yDown=true，已处理坐标系转换，无需手动翻转 Y 轴
    spine.position.set(
      resolvedW / 2 - centerX * renderScale,
      resolvedH / 2 - centerY * renderScale
    )
    spine.scale.set(renderScale)

    pixiApp.stage.addChild(spine)

    // 直接把 PixiJS 的 WebGL canvas 作为可见元素挂进 DOM。
    // 让 canvas 用 CSS 撑满宿主容器,内部分辨率由 renderer 决定,
    // 视觉缩放交给 CSS,既清晰又零逐帧拷贝。
    const pixiCanvas = pixiApp.view as HTMLCanvasElement
    pixiCanvas.style.display = 'block'
    pixiCanvas.style.width = '100%'
    pixiCanvas.style.height = '100%'
    mountEl.appendChild(pixiCanvas)
  }

  remove(id: string): void {
    const instance = this.instances.get(id)
    if (instance) {
      // 纹理通过 metadata.imageLoader 用 new BaseTexture 创建,从不进全局缓存、对本实例私有,
      // 因此可彻底销毁 GPU 资源而不会误伤其它实例(它们各自持有独立纹理)。
      instance.pixiApp.destroy(true, { children: true, texture: true, baseTexture: true })
      this.instances.delete(id)
    }
  }

  setAnimation(id: string, name: string, loop = true): void {
    const instance = this.instances.get(id)
    if (instance) {
      instance.spine.state.setAnimation(0, name, loop)
    }
  }

  /**
   * 设置动画并指定起止时间(秒),实现"动画切片"
   * 用于复刻米哈游 play(spine, "anim", {start, end}) 的关键帧暂停技巧
   * @param id 实例 id
   * @param name 动画名
   * @param loop 是否循环
   * @param fromTime 起始时间(秒),默认 0
   * @param toTime 结束时间(秒),undefined 表示播到原始动画结尾
   */
  setAnimationFromTo(id: string, name: string, loop = true, fromTime = 0, toTime?: number): void {
    const instance = this.instances.get(id)
    if (!instance) return
    const track = instance.spine.state.setAnimation(0, name, loop)
    if (track) {
      track.trackTime = fromTime
      if (toTime !== undefined) {
        track.animationEnd = toTime
      }
    }
  }

  /** 设置当前 track 的播放速度,1=原速,>1 加速,<1 减速 */
  setAnimationTimeScale(id: string, scale: number): void {
    const instance = this.instances.get(id)
    if (!instance) return
    const track = instance.spine.state.tracks?.[0]
    if (track) {
      track.timeScale = scale
    }
  }

  /**
   * 把当前动画完全重置到第 0 帧,并清掉所有动画混合残留状态。
   * 重启镜头演出时调用,确保每次"重新演出"画面真的从头开始播。
   */
  resetAnimation(id: string): void {
    const instance = this.instances.get(id)
    if (!instance) return
    const state = instance.spine.state
    // clearTracks 会移除所有 track + 触发 dispose 事件,比 setAnimation 更彻底
    state.clearTracks()
    // 重置 skeleton 到初始姿态,避免上一次卡帧的 pose 残留到下次演出
    instance.spine.skeleton.setToSetupPose()
  }

  addAnimation(id: string, name: string, loop = true, delay = 0): void {
    const instance = this.instances.get(id)
    if (instance) {
      instance.spine.state.addAnimation(0, name, loop, delay)
    }
  }

  setMix(id: string, from: string, to: string, duration: number): void {
    const instance = this.instances.get(id)
    if (instance) {
      instance.spine.state.data.setMix(from, to, duration)
    }
  }

  getAnimations(id: string): string[] {
    const instance = this.instances.get(id)
    return instance?.spine.spineData.animations.map((a: { name: string }) => a.name) ?? []
  }

  getAnimationDuration(id: string, name: string): number {
    const instance = this.instances.get(id)
    const anim = instance?.spine.spineData.animations.find((a: { name: string }) => a.name === name)
    return ((anim as { duration?: number })?.duration ?? 0) * 1000
  }

  getCurrentAnimation(id: string): string | null {
    const instance = this.instances.get(id)
    const tracks = instance?.spine.state.tracks
    // ITrackEntry 接口未声明 animation 字段，但运行时实际存在
    const track = tracks?.[0] as (ITrackEntry & { animation?: { name: string } }) | undefined
    return track?.animation?.name ?? null
  }

  onComplete(id: string, callback: AnimationCompleteCallback): void {
    const instance = this.instances.get(id)
    if (instance) {
      instance.completeCallbacks.push(callback)
    }
  }

  offComplete(id: string, callback?: AnimationCompleteCallback): void {
    const instance = this.instances.get(id)
    if (instance) {
      if (callback) {
        instance.completeCallbacks = instance.completeCallbacks.filter((cb) => cb !== callback)
      } else {
        instance.completeCallbacks = []
      }
    }
  }

  /**
   * 设置外部镜头覆盖（供 CameraDirector 使用）
   * 通过调整 spine 的 position 和 scale 模拟镜头效果
   */
  setCameraOverride(id: string, override: CameraOverride): void {
    const instance = this.instances.get(id)
    if (!instance) return
    instance.cameraOverride = override

    const { spine, targetWidth, targetHeight } = instance
    const { centerX, centerY, viewWidth, viewHeight, offsetX = 0, offsetY = 0 } = override

    const scaleX = targetWidth / viewWidth
    const scaleY = targetHeight / viewHeight
    const renderScale = Math.min(scaleX, scaleY)

    // 构图偏移作用于 canvas 像素空间,与镜头公式同坐标系直接相加,
    // 不再依赖外层 DOM translate3d,避免两套坐标拼贴造成的语义错位
    const offsetPxX = offsetX * targetWidth
    const offsetPxY = offsetY * targetHeight

    spine.position.set(
      targetWidth / 2 - centerX * renderScale + offsetPxX,
      targetHeight / 2 - centerY * renderScale + offsetPxY
    )
    spine.scale.set(renderScale)
  }

  clearCameraOverride(id: string): void {
    const instance = this.instances.get(id)
    if (!instance) return
    instance.cameraOverride = null

    // 恢复默认视口
    const { spine, bounds, targetWidth, targetHeight } = instance
    const padding = 1.1
    const skeletonAspect = bounds.width / bounds.height
    const canvasAspect = targetWidth / targetHeight

    let viewWidth: number
    let viewHeight: number
    if (skeletonAspect > canvasAspect) {
      viewWidth = bounds.width * padding
      viewHeight = viewWidth / canvasAspect
    } else {
      viewHeight = bounds.height * padding
      viewWidth = viewHeight * canvasAspect
    }

    const scaleX = targetWidth / viewWidth
    const scaleY = targetHeight / viewHeight
    const renderScale = Math.min(scaleX, scaleY)

    const centerX = bounds.offsetX + bounds.width / 2
    const centerY = bounds.offsetY + bounds.height / 2

    spine.position.set(
      targetWidth / 2 - centerX * renderScale,
      targetHeight / 2 - centerY * renderScale
    )
    spine.scale.set(renderScale)
  }

  getBounds(id: string): { width: number; height: number; offsetX: number; offsetY: number } | null {
    const instance = this.instances.get(id)
    return instance?.bounds ?? null
  }

  /**
   * 获取当前帧 spine 容器在 PixiJS 里的真实变换。
   * 用于把 spine 世界坐标投影回屏幕像素 - 由于变换是当前实际渲染用的,
   * 标记位置必然与画面像素严格对齐,不会受 viewport 公式差异影响。
   */
  getSpineTransform(id: string): { x: number; y: number; scaleX: number; scaleY: number } | null {
    const instance = this.instances.get(id)
    if (!instance) return null
    return {
      x: instance.spine.position.x,
      y: instance.spine.position.y,
      scaleX: instance.spine.scale.x,
      scaleY: instance.spine.scale.y,
    }
  }

  hasInstance(id: string): boolean {
    return this.instances.has(id)
  }

  getAllIds(): string[] {
    return Array.from(this.instances.keys())
  }

  dispose(): void {
    this.instances.forEach((instance) => {
      // 纹理私有(由 metadata.imageLoader 创建,不进全局缓存),可安全彻底销毁
      instance.pixiApp.destroy(true, { children: true, texture: true, baseTexture: true })
    })
    this.instances.clear()
    this.loadingPromises.clear()
  }
}

export const SharedSpineRenderer = new SharedSpineRendererClass()

if (typeof window !== 'undefined') {
  ;(window as Window & { spine?: typeof SharedSpineRenderer }).spine = SharedSpineRenderer
}
