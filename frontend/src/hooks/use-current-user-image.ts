import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export const useCurrentUserImage = () => {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUserImage = async () => {
      const { data, error } = await createClient().auth.getSession();
      if (error || cancelled) {
        return;
      }

      if (!cancelled) {
        setImage(data.session?.user.user_metadata.avatar_url ?? null);
      }
    };

    fetchUserImage();

    return () => {
      cancelled = true;
    };
  }, []);

  return image;
};
