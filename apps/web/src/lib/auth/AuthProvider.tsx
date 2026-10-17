import type { ReactNode } from 'react';
import {
  AuthContext,
  toAuthActionError,
  type AuthContextType,
} from './authState';
import { signOutSession } from './session';
import { useSession } from './useSession';

export function AuthProvider({ children }: { children: ReactNode }) {
  const sessionState = useSession();
  const user = sessionState.data?.user ?? null;

  const signOut: AuthContextType['signOut'] = async () => {
    try {
      await signOutSession();
      await sessionState.refetch();

      return { error: null };
    } catch (error) {
      return { error: toAuthActionError(error) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: sessionState.isPending,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
