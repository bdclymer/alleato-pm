"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { ChatLayout } from "@/components/chat/chat-layout";

export default function TeamChatPage(): ReactElement {
  const [username, setUsername] = useState(
    "User_" + Math.random().toString(36).substring(7),
  );

  return (
    <div className="h-full bg-background text-foreground">
      <ChatLayout username={username} onUsernameChange={setUsername} />
    </div>
  );
}
