// File: src/components/ChatKitWidget.tsx
"use client";

import { useState, useCallback } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import {
  CHATKIT_API_URL,
  GREETING,
  STARTER_PROMPTS,
  PLACEHOLDER_INPUT,
} from "@/lib/chatkit-config";

export function ChatKitWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const handleResponseEnd = useCallback(() => {
    }, []);

  const handleError = useCallback(({ error }: { error: Error }) => {
    }, []);

  const getClientSecret = useCallback(async (existingSecret: string | null) => {
    const response = await fetch(CHATKIT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Failed to create ChatKit session");
    }

    const { client_secret } = await response.json();
    return client_secret;
  }, []);

  const chatkit = useChatKit({
    api: { getClientSecret },
    theme: {
      colorScheme: "light",
      color: {
        grayscale: { hue: 220, tint: 6, shade: -4 },
        accent: { primary: "#0f172a", level: 1 },
      },
      radius: "round",
    },
    startScreen: { greeting: GREETING, prompts: STARTER_PROMPTS },
    composer: { placeholder: PLACEHOLDER_INPUT },
    threadItemActions: { feedback: false },
    onResponseEnd: handleResponseEnd,
    onError: handleError,
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-16 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:scale-110 transition-all duration-200 flex items-center justify-center sm:bottom-6"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-32 right-6 z-50 shadow-sm rounded-lg overflow-hidden border border-border sm:bottom-24">
          <ChatKit
            control={chatkit.control}
            className="h-[600px] w-[400px] max-w-[calc(100vw-3rem)]"
          />
        </div>
      )}
    </>
  );
}
