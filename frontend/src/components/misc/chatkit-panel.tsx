"use client";
/* eslint-disable design-system/no-raw-heading */

import { ChatKit, useChatKit } from "@openai/chatkit-react";
import React from "react";

type ChatKitPanelProps = {
  initialThreadId?: string | null;
  onThreadChange?: (threadId: string | null) => void;
  onResponseEnd?: () => void;
  onRunnerUpdate?: () => void;
  onRunnerEventDelta?: (events: any[]) => void;
  onRunnerBindThread?: (threadId: string) => void;
};

const CHATKIT_DOMAIN_KEY =
  process.env.NEXT_PUBLIC_CHATKIT_DOMAIN_KEY ?? "domain_pk_localhost_dev";

export function ChatKitPanel({
  initialThreadId,
  onThreadChange,
  onResponseEnd,
  onRunnerUpdate,
  onRunnerEventDelta,
  onRunnerBindThread,
}: ChatKitPanelProps) {
  const chatkit = useChatKit({
    api: {
      url: "/chatkit",
      domainKey: CHATKIT_DOMAIN_KEY,
    },
    composer: {
      placeholder: "Message Alleato AI...",
    },
    history: {
      enabled: true,
      showDelete: true,
      showRename: true,
    },
    theme: {
      colorScheme: "light",
      radius: "round",
      density: "spacious",
      color: {
        accent: {
          primary: "#10a37f",
          level: 1,
        },
      },
    },
    initialThread: initialThreadId ?? null,
    startScreen: {
      greeting:
        "Hi! I'm your Alleato AI assistant. I have access to your project data, meetings, and more.",
      prompts: [
        {
          label: "What projects do we have?",
          prompt: "What projects do we have?",
        },
        {
          label: "What meetings happened today?",
          prompt: "What meetings happened today?",
        },
        {
          label: "Summarize the latest meetings",
          prompt: "Summarize the latest meetings",
        },
      ],
    },
    threadItemActions: {
      feedback: false,
    },
    onThreadChange: ({ threadId }: { threadId: any }) => onThreadChange?.(threadId ?? null),
    onResponseEnd: () => onResponseEnd?.(),
    onError: ({ error }: { error: any }) => {
      },
    onEffect: async ({ name }: { name: any }) => {
      if (name === "runner_state_update") {
        onRunnerUpdate?.();
      }
      if (name === "runner_event_delta") {
        onRunnerEventDelta?.((arguments as any)?.[0]?.data?.events ?? []);
      }
      if (name === "runner_bind_thread") {
        const tid = (arguments as any)?.[0]?.data?.thread_id;
        if (tid) {
          onRunnerBindThread?.(tid);
        }
      }
    },
  });

  return (
    <div className="flex flex-col h-full flex-1 bg-background shadow-sm border border-border border-t-0 rounded-xl">
      <div className="bg-emerald-600 text-white h-12 px-4 flex items-center rounded-t-xl">
        <h2 className="font-semibold text-sm sm:text-base lg:text-lg">
          Alleato AI Chat
        </h2>
      </div>
      <div className="flex-1 overflow-hidden pb-1.5">
        <ChatKit
          control={chatkit.control}
          className="block h-full w-full"
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  );
}
