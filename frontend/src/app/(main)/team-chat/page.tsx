"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChatLayout } from "@/components/chat/chat-layout";

export default function TeamChatPage(): ReactElement {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser()
      .then(async ({ data: { user } }) => {
        if (!user) {
          setUsername("User");
          return;
        }
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .maybeSingle();
        setUsername(profile?.full_name ?? profile?.email ?? user.email ?? "User");
      })
      .catch(() => {
        setUsername("User");
      });
  }, []);

  if (!username) return <div className="h-svh w-full" />;

  return (
    <div className="h-svh w-full overflow-hidden">
      <ChatLayout username={username} />
    </div>
  );
}
