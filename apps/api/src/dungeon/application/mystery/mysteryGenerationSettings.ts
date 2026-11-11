/**
 * 剧本生成各步是否开启模型的思考模式。大纲定真相与人物、审校找矛盾，最依赖推理，开启；
 * 正文三段只按已定的大纲写文字，不开，省下约一半耗时。
 * 开启思考的 Alibaba 调用由 aiClient 统一设置 4096 token 思考预算。
 */
export const MYSTERY_GENERATION_THINKING = {
  outline: true,
  text: false,
  review: true,
} as const;

/**
 * 审校成本控制：审校只做事实比对，不需要长篇推理。
 * - thinkingEffort 用 low，减少思考 token；
 * - 生成阶段最多两轮，只有发现严重矛盾时才整篇复检；
 * - 生成审校未发现问题时，跳过独立的入库审校。
 */
export const MYSTERY_REVIEW_POLICY = {
  thinkingEffort: 'low',
  maxReviewRounds: 2,
  auditOnlyWhenIssues: true,
} as const;

/**
 * 单步总时限，含结构校验失败后的重试。开启思考后大纲一次约 1 万输出 token、
 * 耗时约 5 分钟，须容得下两次尝试；生成在后台进行，留足时间。
 */
export const MYSTERY_STAGE_TIMEOUT_MS = 15 * 60_000;
