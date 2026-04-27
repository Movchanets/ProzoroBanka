import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiry: string | null;
  user: User | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (accessToken: string, refreshToken: string, accessTokenExpiry: string, user: User) => void;
  setTokens: (accessToken: string, refreshToken: string, accessTokenExpiry: string) => void;
  updateUser: (user: User) => void;
  setHydrated: (state: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      accessTokenExpiry: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (accessToken, refreshToken, accessTokenExpiry, user) =>
        set({ accessToken, refreshToken, accessTokenExpiry, user, isAuthenticated: true }),
      setTokens: (accessToken, refreshToken, accessTokenExpiry) =>
        set({ accessToken, refreshToken, accessTokenExpiry }),
      updateUser: (user) =>
        set((state) => ({ ...state, user })),
      setHydrated: (state) =>
        set({ _hasHydrated: state }),
      logout: () =>
        set({ accessToken: null, refreshToken: null, accessTokenExpiry: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        accessTokenExpiry: state.accessTokenExpiry,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
