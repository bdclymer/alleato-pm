import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";

export const useCurrentUserImage = () => {
  const { profile } = useCurrentUserProfile();
  return profile?.avatarUrl ?? null;
};
