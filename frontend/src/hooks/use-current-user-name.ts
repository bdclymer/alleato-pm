import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

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
        setName(data.session?.user.user_metadata.full_name ?? "?");
      }
    };

    fetchProfileName();

    return () => {
      cancelled = true;
    };
  }, []);

  return name || "?";
};
