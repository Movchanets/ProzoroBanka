import { useMutation } from '@tanstack/react-query';
import {
  authService,
  type ForgotPasswordPayload,
  type GoogleLoginPayload,
  type LoginPayload,
  type RegisterPayload,
  type ResetPasswordPayload,
} from '../../services/authService';
import { queryClient } from '../../services/queryClient';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

const profileQueryKey = ['profile'];

export function useLoginMutation() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (response) => {
      setAuth(response.accessToken, response.refreshToken, response.accessTokenExpiry, response.user);
      queryClient.setQueryData(profileQueryKey, response.user);
    },
  });
}

export function useRegisterMutation() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: (response) => {
      setAuth(response.accessToken, response.refreshToken, response.accessTokenExpiry, response.user);
      queryClient.setQueryData(profileQueryKey, response.user);
    },
  });
}

export function useGoogleLoginMutation() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (payload: GoogleLoginPayload) => authService.googleLogin(payload),
    onSuccess: (response) => {
      setAuth(response.accessToken, response.refreshToken, response.accessTokenExpiry, response.user);
      queryClient.setQueryData(profileQueryKey, response.user);
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