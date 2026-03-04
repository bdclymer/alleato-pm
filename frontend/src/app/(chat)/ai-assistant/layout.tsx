"use client";

import { useEffect } from "react";

/**
 * Layout for AI Assistant page.
 * - Hides the footer for a full-height chat experience (like ChatGPT).
 * - Negates parent <main>'s p-4 padding so the chat fills edge-to-edge.
 */
export default function AIAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hide the footer on this page for full-bleed chat
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (footer) {
      (footer as HTMLElement).style.display = "none";
    }
    return () => {
      if (footer) {
        (footer as HTMLElement).style.display = "";
      }
    };
  }, []);

  return (
    <div className="-mx-4 -mb-4 flex min-h-0 flex-1 overflow-hidden">
      {children}
    </div>
  );
}
