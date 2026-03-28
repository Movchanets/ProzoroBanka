import { useMutation } from '@tanstack/react-query';
import {
  authService,
  type ForgotPasswordPayload,
  type GoogleLoginPayload,
  type LoginPayload,
  type RegisterPayload,
  type ResetPasswordPayload,
} from '../../services/authService';
import { profileService } from '../../services/profileService';
import { queryClient } from '../../services/queryClient';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export function useLoginMutation() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: async (response) => {
      setAuth(response.accessToken, response.refreshToken, response.accessTokenExpiry, response.user);

      try {
        const profile = await profileService.getProfile();
        updateUser(profile);
      } catch (error) {
        void error;
      }
    },
  });
}

export function useRegisterMutation() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: async (response) => {
      setAuth(response.accessToken, response.refreshToken, response.accessTokenExpiry, response.user);

      try {
        const profile = await profileService.getProfile();
        updateUser(profile);
      } catch (error) {
        void error;
      }
    },
  });
}

export function useGoogleLoginMutation() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: (payload: GoogleLoginPayload) => authService.googleLogin(payload),
    onSuccess: async (response) => {
      setAuth(response.accessToken, response.refreshToken, response.accessTokenExpiry, response.user);

      try {
        const profile = await profileService.getProfile();
        updateUser(profile);
      } catch (error) {
        void error;
      }
    },
  });
}

export function useLogoutMutation() {
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      try {
        await authService.logout();
      } finally {
        logout();
        useWorkspaceStore.getState().clearActiveOrg();
        // Clear all cached data across the app to prevent leaks between sessions
        queryClient.clear();
      }
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) => authService.forgotPassword(payload),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => authService.resetPassword(payload),
  });
}