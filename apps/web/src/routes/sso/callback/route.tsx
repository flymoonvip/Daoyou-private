import { AuthPageShell, toErrorMessage } from '@app/components/auth';
import { InkButton } from '@app/components/ui/InkButton';
import type { AuthActionError } from '@app/lib/auth/authState';
import { exchangeSsoTicket } from '@app/lib/auth/session';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

/**
 * 原神市场登录成功后的回跳页：把一次性票据交给本站服务端兑换成本站会话。
 * 票据只能用一次且 60 秒内有效，浏览器全程不接触内部密钥。
 */
export default function SsoCallbackRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ticket = searchParams.get('ticket');
  const startedRef = useRef(false);
  const [message, setMessage] = useState('正在完成登录……');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!ticket) {
      setFailed(true);
      setMessage('缺少登录凭证，请重新登录。');
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await exchangeSsoTicket(ticket);
        if (cancelled) return;
        navigate('/game', { replace: true });
      } catch (error) {
        if (cancelled) return;
        setFailed(true);
        setMessage(
          toErrorMessage(error as AuthActionError, '登录失败，请稍后重试'),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ticket, navigate]);

  return (
    <AuthPageShell title="【登录】" lead={message}>
      {failed ? (
        <div className="space-y-3">
          <InkButton href="/login" variant="primary">
            返回登录
          </InkButton>
        </div>
      ) : null}
    </AuthPageShell>
  );
}
