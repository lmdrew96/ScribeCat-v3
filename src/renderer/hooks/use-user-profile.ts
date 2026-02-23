import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export function useUserProfile() {
  const profile = useQuery(api.userProfiles.getMyProfile);
  const createProfile = useMutation(api.userProfiles.createProfile);
  const updateProfile = useMutation(api.userProfiles.updateProfile);

  return {
    profile,
    hasProfile: profile !== undefined && profile !== null,
    isLoading: profile === undefined,
    createProfile,
    updateProfile,
  };
}
