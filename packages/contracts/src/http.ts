export type ApiSuccess<TData, TMeta = undefined> = {
  success: true;
  data: TData;
  meta?: TMeta;
};

export type ApiFailure = {
  success: false;
  error: string;
  /** 机器可读的失败原因，供前端按类型分流处理 */
  code?: string;
  details?: unknown;
};

export type ApiResult<TData, TMeta = undefined> =
  | ApiSuccess<TData, TMeta>
  | ApiFailure;
