import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiry: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, refreshToken: string, accessTokenExpiry: string, user: User) => void;
  setTokens: (accessToken: string, refreshToken: string, accessTokenExpiry: string) => void;
  updateUser: (user: User) => void;
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
      setAuth: (accessToken, refreshToken, accessTokenExpiry, user) =>
        set({ accessToken, refreshToken, accessTokenExpiry, user, isAuthenticated: true }),
      setTokens: (accessToken, refreshToken, accessTokenExpiry) =>
        set({ accessToken, refreshToken, accessTokenExpiry }),
      updateUser: (user) =>
        set((state) => ({ ...state, user })),
      logout: () =>
        set({ accessToken: null, refreshToken: null, accessTokenExpiry: null, user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
);
