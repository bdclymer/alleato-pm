"use client";

import dynamic from "next/dynamic";

const AIChatWidget = dynamic(
  () =>
    import("@/components/chat/ai-chat-widget").then(
      (module) => module.AIChatWidget,
    ),
  { ssr: false },
);

export function AIChatWidgetLazy() {
  return <AIChatWidget />;
}
