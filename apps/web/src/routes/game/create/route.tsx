import { apiFetch } from '@app/lib/api/fetch';
import { GameLoadingState } from '@app/components/game-shell/GameLoadingState';
import { InkButton, InkNotice } from '@app/components/ui';
import { consumeResourceMutation } from '@app/lib/resources/mutations';
import { usePlayerSession } from '@app/lib/resources/player';
import { CHARACTER_CREATION_BLOCKED_CODE } from '@daoyou/contracts/character-generation';
import type { ApiFailure } from '@daoyou/contracts/http';
import type { PlayerStateMutationResponse } from '@daoyou/contracts/player';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

const genesisPanelClassName =
  'border-battle-rule-strong border border-dashed bg-[rgba(248,243,230,0.88)] px-4 py-4 md:px-5 md:py-5';

/**
 * 建号页 —— 不再由玩家输入提示或择命。
 *
 * 建号提示由主站通过 `?prompt=` 传入；主站尚未建设完成时由服务端初始模板兜底，
 * 先天气运由系统自动分配，玩家确认无需手动保存道身，进入页面即自动入世。
 */
export default function CreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const session = usePlayerSession();
  const hasActiveCultivator = Boolean(session.data?.activeCultivator);
  const isLoading = session.loading;
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const prompt = searchParams.get('prompt')?.trim() ?? '';

  useEffect(() => {
    if (isLoading || finishedRef.current) {
      return;
    }

    if (hasActiveCultivator) {
      if (!startedRef.current) {
        navigate('/game', { replace: true });
      }
      return;
    }

    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    async function createCharacter() {
      try {
        const response = await apiFetch('/api/create-character', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prompt ? { userInput: prompt } : {}),
        });
        const payload = (await response.json().catch(() => null)) as
          | PlayerStateMutationResponse<unknown>
          | ApiFailure
          | null;
        if (!response.ok || !payload || !payload.success) {
          const failure = payload && !payload.success ? payload : null;
          // 账号已有道身（或转服未完成）时服务端不会消耗建号额度，直接回到主界面即可。
          if (failure?.code === CHARACTER_CREATION_BLOCKED_CODE) {
            finishedRef.current = true;
            navigate('/game', { replace: true });
            return;
          }
          throw new Error(failure?.error ?? '建号失败，请重试。');
        }
        await consumeResourceMutation(payload);
        finishedRef.current = true;
        navigate('/game/story', { replace: true });
      } catch (err) {
        startedRef.current = false;
        setError(err instanceof Error ? err.message : '建号失败，请重试。');
      }
    }

    void createCharacter();
  }, [attempt, hasActiveCultivator, isLoading, navigate, prompt]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <section className={genesisPanelClassName}>
          <InkNotice tone="danger">
            {error}
            <div className="mt-3">
              <InkButton
                variant="primary"
                onClick={() => {
                  setError(null);
                  setAttempt((value) => value + 1);
                }}
              >
                重新入世
              </InkButton>
            </div>
          </InkNotice>
        </section>
      </div>
    );
  }

  return (
    <GameLoadingState message="天机推演中，正在凝气成形……" variant="scene" />
  );
}
