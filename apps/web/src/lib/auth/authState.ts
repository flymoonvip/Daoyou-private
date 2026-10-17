import { createContext } from 'react';
import type { SessionUser } from './session';

export type AuthActionError = {
  code?: string;
  message: string;
  originalMessage?: string;
  status?: number;
  statusText?: string;
};

export interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  signOut: () => Promise<{ error: AuthActionError | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function toAuthActionError(error: unknown): AuthActionError | null {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return {
      code:
        'code' in error && typeof error.code === 'string'
          ? error.code
          : undefined,
      message: error.message,
      originalMessage:
        'originalMessage' in error && typeof error.originalMessage === 'string'
          ? error.originalMessage
          : undefined,
      status:
        'status' in error && typeof error.status === 'number'
          ? error.status
          : undefined,
      statusText:
        'statusText' in error && typeof error.statusText === 'string'
          ? error.statusText
          : undefined,
    };
  }

  return {
    message: '请求失败，请稍后重试',
  };
}
