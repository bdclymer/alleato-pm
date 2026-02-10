"use client";

import { useState, useEffect } from "react";
import { ChatSidebar } from "./chat-sidebar";
import { ChatMain } from "./chat-main";
import { ChatRightPanel } from "./chat-right-panel";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface ChatLayoutProps {
  username: string;
  onUsernameChange?: (username: string) => void;
}

export function ChatLayout({ username, onUsernameChange }: ChatLayoutProps) {
  const [activeChannel, setActiveChannel] = useState("general");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="flex h-full min-h-0 bg-[hsl(var(--chat-bg))] text-[hsl(var(--chat-text))]">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <ChatSidebar
          activeChannel={activeChannel}
          onChannelSelect={setActiveChannel}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="p-0 w-64 bg-[hsl(var(--chat-panel))] border-[hsl(var(--chat-border))]"
        >
          <ChatSidebar
            activeChannel={activeChannel}
            onChannelSelect={(channel) => {
              setActiveChannel(channel);
              setSidebarOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatMain
          channelId={activeChannel}
          username={username}
          onUsernameChange={onUsernameChange}
          onToggleSidebar={() => setSidebarOpen(true)}
          onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
          onMessageSelect={setSelectedMessageId}
        />
      </div>

      {/* Desktop Right Panel */}
      <div
        className={`hidden lg:block transition-all ${rightPanelOpen ? "w-80" : "w-0"}`}
      >
        {rightPanelOpen && (
          <ChatRightPanel
            selectedMessageId={selectedMessageId}
            onClose={() => setRightPanelOpen(false)}
          />
        )}
      </div>

      {/* Mobile Right Panel Drawer */}
      <Sheet open={rightPanelOpen && isMobile} onOpenChange={setRightPanelOpen}>
        <SheetContent
          side="right"
          className="p-0 w-80 bg-[hsl(var(--chat-panel))] border-[hsl(var(--chat-border))]"
        >
          <ChatRightPanel
            selectedMessageId={selectedMessageId}
            onClose={() => setRightPanelOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
