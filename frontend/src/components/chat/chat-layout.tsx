"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, Search } from "lucide-react";
import { ChatSidebar } from "./chat-sidebar";
import { ChatMain, type TeamChatMessage } from "./chat-main";
import { ChatRightPanel, type ThreadReply } from "./chat-right-panel";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TEAM_CHANNELS, getTeamChannel } from "./team-chat-data";

interface ChatLayoutProps {
  username: string;
  onUsernameChange?: (username: string) => void;
}

export function ChatLayout({ username }: ChatLayoutProps) {
  const [activeChannel, setActiveChannel] = useState(TEAM_CHANNELS[0]?.id ?? "general");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<TeamChatMessage | null>(null);
  const [threadRepliesByMessage, setThreadRepliesByMessage] = useState<
    Record<string, ThreadReply[]>
  >({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setRightPanelOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const activeChannelDetails = useMemo(
    () => getTeamChannel(activeChannel),
    [activeChannel],
  );

  const selectedThreadReplies = selectedMessage
    ? threadRepliesByMessage[selectedMessage.id] ?? []
    : [];

  const handleAddThreadReply = (content: string) => {
    if (!selectedMessage) return;

    const reply: ThreadReply = {
      id: crypto.randomUUID(),
      content,
      userName: username,
      createdAt: new Date().toISOString(),
    };

    setThreadRepliesByMessage((current) => ({
      ...current,
      [selectedMessage.id]: [...(current[selectedMessage.id] ?? []), reply],
    }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/30 text-foreground">
      <div className="flex h-12 items-center gap-2 border-b border-border bg-muted/60 px-3 sm:px-4">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/90 text-xs font-semibold text-primary-foreground">
            T
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mx-auto hidden w-full max-w-xl sm:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              readOnly
              value=""
              placeholder="Search"
              className="h-8 border-border bg-background pl-9 text-sm"
            />
          </div>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:block">
          <ChatSidebar
            channels={TEAM_CHANNELS}
            activeChannel={activeChannel}
            onChannelSelect={(channelId) => {
              setActiveChannel(channelId);
              setSelectedMessage(null);
            }}
          />
        </div>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-80 p-0 sm:max-w-80">
            <ChatSidebar
              channels={TEAM_CHANNELS}
              activeChannel={activeChannel}
              onChannelSelect={(channelId) => {
                setActiveChannel(channelId);
                setSelectedMessage(null);
                setSidebarOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <ChatMain
            channel={activeChannelDetails}
            username={username}
            onToggleSidebar={() => setSidebarOpen(true)}
            onToggleRightPanel={() => setRightPanelOpen((open) => !open)}
            onMessageSelect={(message) => {
              setSelectedMessage(message);
              setRightPanelOpen(true);
            }}
            selectedMessageId={selectedMessage?.id ?? null}
            threadReplyCountByMessage={Object.fromEntries(
              Object.entries(threadRepliesByMessage).map(([messageId, replies]) => [
                messageId,
                replies.length,
              ]),
            )}
          />
        </div>

        <div
          className={`hidden xl:block border-l border-border transition-all duration-150 ${
            rightPanelOpen ? "w-96" : "w-0"
          }`}
        >
          {rightPanelOpen ? (
            <ChatRightPanel
              channel={activeChannelDetails}
              selectedMessage={selectedMessage}
              threadReplies={selectedThreadReplies}
              onAddThreadReply={handleAddThreadReply}
              onClose={() => setRightPanelOpen(false)}
            />
          ) : null}
        </div>
      </div>

      <Sheet open={Boolean(rightPanelOpen && isMobile)} onOpenChange={setRightPanelOpen}>
        <SheetContent side="right" className="w-96 p-0 sm:max-w-96">
          <ChatRightPanel
            channel={activeChannelDetails}
            selectedMessage={selectedMessage}
            threadReplies={selectedThreadReplies}
            onAddThreadReply={handleAddThreadReply}
            onClose={() => setRightPanelOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
