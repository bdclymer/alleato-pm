import { createClient } from "@/lib/supabase/client";
import { getCurrentBrowserUser } from "@/lib/supabase/current-user";
import { useEffect, useState } from "react";

type UserMetadata = {
  avatar_url?: string;
};

export const useCurrentUserImage = () => {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUserImage = async () => {
      const user = await getCurrentBrowserUser(createClient());
      if (cancelled) {
        return;
      }

      const metadata = (user?.user_metadata ?? {}) as UserMetadata;
      setImage(metadata.avatar_url ?? null);
    };

    fetchUserImage().catch((fetchError) => {
      console.warn("[useCurrentUserImage] Failed to resolve current user image.", fetchError);
      if (!cancelled) {
        setImage(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return image;
};
