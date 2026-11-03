import { toErrorMessage } from '@app/components/auth';
import { InkModal } from '@app/components/layout/InkModal';
import { useInkUI } from '@app/components/providers/InkUIProvider';
import { InkButton } from '@app/components/ui/InkButton';
import { InkInput } from '@app/components/ui/InkInput';
import {
  ACCOUNT_DELETION_CONFIRMATION,
  clearAccountDeletionBrowserData,
  isAccountDeletionConfirmation,
} from '@app/lib/auth/accountDeletion';
import type { AuthActionError } from '@app/lib/auth/authState';
import { toAuthActionError } from '@app/lib/auth/authState';
import { deleteAccount, signOutSession } from '@app/lib/auth/session';
import { useSession } from '@app/lib/auth/useSession';
import { clientEnv } from '@app/lib/env';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  SettingsField,
  SettingsMessage,
  SettingsSection,
  settingsLabelClass,
} from './SettingsFields';
import { formatDateTime } from './utils';

export function AccountSettingsTab() {
  const sessionState = useSession();
  const navigate = useNavigate();
  const { openDialog, pushToast } = useInkUI();
  const user = sessionState.data?.user ?? null;
  const [logoutSubmitting, setLogoutSubmitting] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);
  const [deletionExpanded, setDeletionExpanded] = useState(false);
  const [deletionConfirmation, setDeletionConfirmation] = useState('');
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);
  const [deletionMessage, setDeletionMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (logoutSubmitting) return;

    let didNavigate = false;
    setLogoutSubmitting(true);
    setLogoutMessage(null);

    try {
      await signOutSession();
      pushToast({ message: '已退出登录', tone: 'success' });
      didNavigate = true;
      navigate('/login', { replace: true });
    } catch (error) {
      const message = toErrorMessage(error as AuthActionError, '退出登录失败');
      setLogoutMessage(message);
      pushToast({ message, tone: 'danger' });
    } finally {
      if (!didNavigate) {
        setLogoutSubmitting(false);
      }
    }
  };

  const openLogoutConfirm = () => {
    if (logoutSubmitting) return;

    openDialog({
      title: '退出登录',
      content: '确定要退出当前账号吗？退出后需要重新登录才能继续游历。',
      confirmLabel: '确认退出',
      cancelLabel: '取消',
      loadingLabel: '退出中……',
      onConfirm: handleSignOut,
    });
  };

  const handleDeleteAccount = async () => {
    if (
      deletionSubmitting ||
      !isAccountDeletionConfirmation(deletionConfirmation)
    ) {
      return;
    }

    let didNavigate = false;
    setDeletionSubmitting(true);
    setDeletionMessage(null);

    try {
      await deleteAccount();
      clearAccountDeletionBrowserData();
      pushToast({ message: '账号已注销', tone: 'success' });
      didNavigate = true;
      navigate('/login', { replace: true });
    } catch (error) {
      const message = toErrorMessage(
        error as AuthActionError,
        '账号注销失败，请稍后重试',
      );
      setDeletionMessage(message);
      pushToast({ message, tone: 'danger' });
    } finally {
      if (!didNavigate) {
        setDeletionSubmitting(false);
      }
    }
  };

  const cancelDeleteAccount = () => {
    if (deletionSubmitting) return;
    setDeletionExpanded(false);
    setDeletionConfirmation('');
    setDeletionMessage(null);
  };

  return (
    <div className="space-y-6">
      <SettingsSection>
        <SettingsField label="用户 ID" value={user?.id ?? '—'} mono />
        <SettingsField label="昵称" value={user?.name || '—'} />
        <SettingsField label="邮箱" value={user?.email || '—'} mono />
        <SettingsField
          label="邮箱验证"
          value={user?.emailVerified ? '已验证' : '未验证'}
        />
        <SettingsField
          label="账号创建时间"
          value={formatDateTime(user?.createdAt ?? null)}
        />
      </SettingsSection>

      <SettingsSection
        title="账号与密码"
        description="当前账号由原神市场账号统一管理：邮箱、密码以及找回密码都在原神市场完成，本站不保存密码。"
      >
        {clientEnv.genshinMarketAccountUrl ? (
          <InkButton
            href={clientEnv.genshinMarketAccountUrl}
            variant="secondary"
          >
            前往原神市场管理账号
          </InkButton>
        ) : (
          <p className="text-ink-secondary text-sm leading-6">
            如需修改密码或邮箱，请前往原神市场的账号设置页面操作。
          </p>
        )}
      </SettingsSection>

      <SettingsSection
        title="跨服转移"
        description="定向导出角色或查看目标服的导入审核。导出后原角色会暂时冻结。"
      >
        <InkButton href="/transfer">管理转服</InkButton>
      </SettingsSection>

      <SettingsSection
        title="登录状态"
        description="退出当前浏览器的登录状态，不会删除账号或角色数据。"
      >
        <div className="flex flex-wrap items-center gap-3">
          <InkButton
            variant="primary"
            onClick={openLogoutConfirm}
            disabled={deletionSubmitting}
            pending={logoutSubmitting}
            pendingLabel="退出中……"
          >
            退出登录
          </InkButton>
          {logoutMessage ? (
            <SettingsMessage type="error">{logoutMessage}</SettingsMessage>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        title="注销账号"
        description="此操作无法撤销，请确认已了解注销后的影响。"
        className="border-crimson/35 bg-crimson/8 border px-4 pb-4"
      >
        <InkButton
          variant="primary"
          onClick={() => setDeletionExpanded(true)}
          disabled={logoutSubmitting || deletionSubmitting}
        >
          注销账号
        </InkButton>
      </SettingsSection>

      <InkModal
        isOpen={deletionExpanded}
        onClose={cancelDeleteAccount}
        title="永久注销账号"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <InkButton
              variant="secondary"
              onClick={cancelDeleteAccount}
              disabled={deletionSubmitting}
            >
              取消
            </InkButton>
            <InkButton
              variant="primary"
              onClick={handleDeleteAccount}
              disabled={!isAccountDeletionConfirmation(deletionConfirmation)}
              pending={deletionSubmitting}
              pendingLabel="注销中……"
            >
              永久注销账号
            </InkButton>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="text-ink-secondary space-y-1 text-sm leading-6">
            <p>这里只会永久注销万界道友侧的账号与角色数据。</p>
            <p>原神市场账号不受影响，之后仍可用它重新进入本站。</p>
          </div>

          <InkInput
            label={`输入“${ACCOUNT_DELETION_CONFIRMATION}”确认`}
            placeholder={ACCOUNT_DELETION_CONFIRMATION}
            value={deletionConfirmation}
            onChange={setDeletionConfirmation}
            disabled={deletionSubmitting}
            size="sm"
            labelClassName={settingsLabelClass}
          />

          {deletionMessage ? (
            <SettingsMessage type="error">{deletionMessage}</SettingsMessage>
          ) : null}
        </div>
      </InkModal>
    </div>
  );
}
