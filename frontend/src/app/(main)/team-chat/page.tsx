"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { ChatLayout } from "@/components/chat/chat-layout";
import { PageShell } from "@/components/layout";

export default function TeamChatPage(): ReactElement {
  const [username, setUsername] = useState(`User_${Math.random().toString(36).slice(2, 8)}`);

  return (
    <PageShell
      variant="table"
      title="Team Chat"
      showHeader={false}
      className="h-full !mx-0 !max-w-none !px-0 sm:!px-0 lg:!px-0 !py-0 sm:!py-0"
      contentClassName="h-full w-full m-0 p-0"
    >
      <div
        className="h-full w-full overflow-hidden"
        style={{ height: "calc(100vh - 8.5rem)" }}
      >
        <ChatLayout username={username} onUsernameChange={setUsername} />
      </div>
    </PageShell>
  );
}
