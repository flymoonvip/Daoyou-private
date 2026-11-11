/**
 * 角色立绘的 Spine 模型登记表。
 *
 * 素材放在 `public/spine/<slug>/`，以静态路径运行时加载，不进主包，也不进 PWA 预缓存。
 * `animation` 必须与模型 JSON 内的动画名一致：米哈游模型常只有一条名为
 * `animation` 或 `a` 的待机循环。
 */
export type SpineModelConfig = {
  /** 与 `public/spine/<slug>/` 下的文件一一对应 */
  slug: string;
  jsonUrl: string;
  atlasUrl: string;
  animation: string;
};

const SPINE_ASSET_BASE = '/spine';

const model = (slug: string, file: string, animation: string) => ({
  slug,
  jsonUrl: `${SPINE_ASSET_BASE}/${slug}/${file}.json`,
  atlasUrl: `${SPINE_ASSET_BASE}/${slug}/${file}.atlas`,
  animation,
});

/** 键为道友角色名；与 1000009 转世名单中的中文名一致。 */
const MODELS_BY_NAME: Record<string, SpineModelConfig> = {
  神里绫华: model('ayaka', 'shenli', 'animation'),
  琴: model('jean', 'qin', 'animation'),
  迪卢克: model('diluc', 'DLUK', 'a'),
};

export function resolveSpineModel(name: string): SpineModelConfig | null {
  return MODELS_BY_NAME[name] ?? null;
}
