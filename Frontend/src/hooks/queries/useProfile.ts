import { useMutation, useQuery } from '@tanstack/react-query';
import { profileService } from '../../services/profileService';
import { queryClient } from '../../services/queryClient';
import { useAuthStore } from '../../stores/authStore';
import type { ProfileUpdatePayload } from '../../types';

const profileQueryKey = ['profile'];

export function useProfileQuery() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: profileQueryKey,
    queryFn: profileService.getProfile,
    enabled: isAuthenticated,
  });
}

export function useUpdateProfileMutation() {
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => profileService.updateProfile(payload),
    onSuccess: (user) => {
      updateUser(user);
      queryClient.setQueryData(profileQueryKey, user);
    },
  });
}

export function useUploadAvatarMutation() {
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: (file: File) => profileService.uploadAvatar(file),
    onSuccess: (user) => {
      updateUser(user);
      queryClient.setQueryData(profileQueryKey, user);
    },
  });
}