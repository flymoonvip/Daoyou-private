import { z } from 'zod';

const positiveInteger = (fallback: string, max = Number.MAX_SAFE_INTEGER) =>
  z
    .string()
    .default(fallback)
    .refine(
      (value) =>
        /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= max,
      'must be a positive integer within the allowed range',
    );

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    APP_ENV: z.enum(['local', 'staging', 'production']).optional(),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: positiveInteger('3000', 65535),
    DATABASE_URL: z
      .url()
      .refine(
        (value) => /^postgres(?:ql)?:/.test(value),
        'must be a PostgreSQL URL',
      ),
    DB_MAX_CONNECTIONS: positiveInteger('20'),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_ALLOWED_HOSTS: z.string().optional(),
    REDIS_URL: z
      .union([
        z.literal(''),
        z
          .url()
          .refine((value) => /^rediss?:/.test(value), 'must be a Redis URL'),
      ])
      .optional(),
    NATS_SERVERS: z.string().trim().min(1),
    NATS_USER: z.string().trim().min(1),
    NATS_PASSWORD: z.string().min(1),
    // 跨站 SSO：登录身份统一由原神市场账号提供。
    // GENSHIN_MARKET_SSO_BASE_URL 为原神市场 API 基址（服务端直连，不经浏览器）；
    // SSO_INTERNAL_SECRET 为两侧共享的内部密钥，用于兑换一次性票据。
    GENSHIN_MARKET_SSO_BASE_URL: z.url().optional(),
    SSO_INTERNAL_SECRET: z.string().min(32).optional(),
    CRON_SECRET: z.string().optional(),
    TRANSFER_SERVER_ID: z.string().trim().regex(/^[A-Za-z0-9._-]{1,160}$/).optional(),
    TRANSFER_SIGNING_PRIVATE_KEY_B64: z.string().optional(),
    TRANSFER_ENCRYPTION_PRIVATE_KEY_B64: z.string().optional(),
    SMTP_PORT: positiveInteger('465', 65535),
    API_IP_RATE_LIMIT_WINDOW_SECONDS: positiveInteger('60'),
    API_IP_RATE_LIMIT_MAX_REQUESTS: positiveInteger('300'),
  })
  .catchall(z.string().optional())
  .superRefine((env, ctx) => {
    const transferValues = [env.TRANSFER_SERVER_ID, env.TRANSFER_SIGNING_PRIVATE_KEY_B64, env.TRANSFER_ENCRYPTION_PRIVATE_KEY_B64];
    if (transferValues.some(Boolean) && !transferValues.every(Boolean)) {
      ctx.addIssue({ code: 'custom', path: ['TRANSFER_SERVER_ID'], message: 'transfer identity and both private keys must be configured together' });
    }
    if (env.NODE_ENV === 'production' && !env.REDIS_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['REDIS_URL'],
        message: 'is required in production',
      });
    }
    if (env.NODE_ENV === 'production' && !env.CRON_SECRET?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['CRON_SECRET'],
        message: 'is required in production',
      });
    }
    const ssoValues = [env.GENSHIN_MARKET_SSO_BASE_URL, env.SSO_INTERNAL_SECRET];
    if (ssoValues.some(Boolean) && !ssoValues.every(Boolean)) {
      ctx.addIssue({
        code: 'custom',
        path: ['GENSHIN_MARKET_SSO_BASE_URL'],
        message: '跨站 SSO 的基址与内部密钥必须同时配置',
      });
    }
    if (env.NODE_ENV === 'production' && !ssoValues.every(Boolean)) {
      ctx.addIssue({
        code: 'custom',
        path: ['SSO_INTERNAL_SECRET'],
        message: 'is required in production',
      });
    }
    if (env.NODE_ENV === 'production' && env.APP_ENV === 'local') {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_ENV'],
        message: 'local is forbidden in production',
      });
    }
  });

export type RuntimeEnvironment = z.infer<typeof environmentSchema>;
let environment: RuntimeEnvironment | undefined;

// Also used by framework-independent repositories and maintenance commands.
// One immutable startup snapshot; no implicit dotenv files or secret logging.
export function getRuntimeEnvironment(): RuntimeEnvironment {
  if (environment) return environment;
  const result = environmentSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Invalid server configuration: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    );
  }
  environment = Object.freeze(result.data);
  return environment;
}
