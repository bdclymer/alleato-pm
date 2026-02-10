"use client";

import type { CSSProperties, ReactElement } from "react";
import { useState } from "react";
import { ChatLayout } from "@/components/chat/chat-layout";

const chatTheme: CSSProperties = {
  "--chat-bg": "0 0% 100%",
  "--chat-panel": "0 0% 98%",
  "--chat-panel-2": "0 0% 96%",
  "--chat-border": "0 0% 89.8%",
  "--chat-text": "0 0% 15%",
  "--chat-muted": "0 0% 45%",
  "--chat-accent": "var(--brand)",
  "--chat-accent-2": "var(--brand)",
  "--chat-hover": "0 0% 94%",
};

export default function TeamChatPage(): ReactElement {
  const [username, setUsername] = useState(
    "User_" + Math.random().toString(36).substring(7),
  );

  return (
    <div style={chatTheme} className="bg-background text-foreground">
      <ChatLayout username={username} onUsernameChange={setUsername} />
    </div>
  );
}
