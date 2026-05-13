import { createClient } from "@/lib/supabase/client";
import { getCurrentBrowserUser } from "@/lib/supabase/current-user";
import { useEffect, useState } from "react";

type UserMetadata = {
  full_name?: string;
  name?: string;
};

function getDisplayName(user: {
  email?: string | null;
  user_metadata?: UserMetadata | null;
}) {
  const metadata = user.user_metadata ?? {};
  return (
    metadata.full_name?.trim() ||
    metadata.name?.trim() ||
    user.email?.split("@")[0] ||
    "Unknown user"
  );
}

export const useCurrentUserName = () => {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProfileName = async () => {
      const user = await getCurrentBrowserUser(createClient());
      if (cancelled) {
        return;
      }

      setName(user ? getDisplayName(user) : null);
    };

    fetchProfileName().catch((fetchError) => {
      console.warn("[useCurrentUserName] Failed to resolve current user name.", fetchError);
      if (!cancelled) {
        setName(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return name || "Unknown user";
};
