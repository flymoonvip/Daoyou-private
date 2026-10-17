const clientImportMetaEnv = import.meta.env as Record<
  string,
  string | undefined
>;

function getOptionalEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = clientImportMetaEnv[name];
    if (value) {
      return value;
    }
  }

  return undefined;
}

export const clientEnv = {
  apiBaseUrl: getOptionalEnv('VITE_API_BASE_URL')?.replace(/\/+$/, ''),
  /** 原神市场登录页地址（含路径）。登录按钮会带上 redirect 参数跳转到这里。 */
  genshinMarketLoginUrl: getOptionalEnv(
    'VITE_GENSHIN_MARKET_LOGIN_URL',
  )?.replace(/\/+$/, ''),
  /** 原神市场账号设置页地址，用于引导玩家去修改密码；未配置时不显示入口。 */
  genshinMarketAccountUrl: getOptionalEnv('VITE_GENSHIN_MARKET_ACCOUNT_URL'),
};
