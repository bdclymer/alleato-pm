import { createClient } from "@/lib/supabase/client";
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
      const { data, error } = await createClient().auth.getSession();
      if (error || cancelled) {
        return;
      }

      if (!cancelled) {
        setName(data.session?.user ? getDisplayName(data.session.user) : null);
      }
    };

    fetchProfileName();

    return () => {
      cancelled = true;
    };
  }, []);

  return name || "Unknown user";
};
