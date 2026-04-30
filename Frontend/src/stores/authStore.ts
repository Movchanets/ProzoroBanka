import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: User) => void;
  updateUser: (user: User) => void;
  setHydrated: (state: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user) =>
        set({ user, isAuthenticated: true }),
      updateUser: (user) =>
        set((state) => ({ ...state, user })),
      setHydrated: (state) =>
        set({ _hasHydrated: state }),
      logout: () =>
        set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[AuthStore] Rehydration error:', error);
        }
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

export const waitAuthHydration = async () => {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  const store = useAuthStore.getState();
  if (store._hasHydrated) return;

  return new Promise<void>((resolve) => {
    const unsub = useAuthStore.subscribe((state) => {
      if (state._hasHydrated) {
        unsub();
        resolve();
      }
    });

    useAuthStore.persist.rehydrate();
  });
};
