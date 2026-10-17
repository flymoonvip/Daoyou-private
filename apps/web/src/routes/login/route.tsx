import {
  AuthChoiceCard,
  AuthPageShell,
  useAuthFeedback,
} from '@app/components/auth';
import { buildGenshinMarketLoginUrl } from '@app/lib/auth/sso';
import { useState } from 'react';

export default function LoginRoute() {
  const { showErrorDialog } = useAuthFeedback();
  const [redirecting, setRedirecting] = useState(false);

  // 本站不再提供邮箱/密码/验证码登录，账号密码统一由原神市场校验。
  const handleMarketSignIn = () => {
    const target = buildGenshinMarketLoginUrl();

    if (!target) {
      showErrorDialog(
        '尚未配置原神市场登录地址，请稍后再试或联系管理员。',
        '登录不可用',
      );
      return;
    }

    setRedirecting(true);
    window.location.href = target;
  };

  return (
    <AuthPageShell
      title="【登录】"
      lead="使用原神市场账号登录，登录后会自动回到万界道友。"
    >
      <div className="space-y-3">
        <AuthChoiceCard
          onClick={handleMarketSignIn}
          disabled={redirecting}
          accent="primary"
          title={redirecting ? '正在前往原神市场……' : '使用原神市场账号登录'}
          description="账号与密码由原神市场统一管理，本站不保存密码。"
        />
      </div>
    </AuthPageShell>
  );
}
