import { useCallback, useEffect, useState } from 'react';
import { toAuthActionError, type AuthActionError } from './authState';
import { getSession, type SessionSnapshot } from './session';

export type SessionState = {
  data: SessionSnapshot | null;
  isPending: boolean;
  error: AuthActionError | null;
  refetch: () => Promise<void>;
};

/**
 * 读取当前会话。代替原先的 `authClient.useSession()`，
 * 保持 `data?.user` 的取值方式不变，便于既有页面平滑迁移。
 */
export function useSession(): SessionState {
  const [data, setData] = useState<SessionSnapshot | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<AuthActionError | null>(null);

  const load = useCallback(async () => {
    const result = await getSession();

    setData(result.data);
    setError(result.error ? toAuthActionError(result.error) : null);
    setIsPending(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isPending, error, refetch: load };
}
