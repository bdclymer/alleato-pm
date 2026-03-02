"use client";

import { X, MessageSquare, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatRightPanelProps {
  selectedMessageId: string | null;
  onClose: () => void;
}

export function ChatRightPanel({
  selectedMessageId,
  onClose,
}: ChatRightPanelProps) {
  return (
    <div className="w-80 h-full bg-[hsl(var(--chat-panel))] border-l border-[hsl(var(--chat-border))] flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-[hsl(var(--chat-border))] flex items-center justify-between px-4">
        <h3 className="font-semibold text-[hsl(var(--chat-text))]">Details</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-[hsl(var(--chat-muted))] hover:text-[hsl(var(--chat-text))] hover:bg-[hsl(var(--chat-hover))]"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="threads" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b border-[hsl(var(--chat-border))] rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger
            value="threads"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--chat-accent))] data-[state=active]:bg-transparent px-4 py-4"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Threads
          </TabsTrigger>
          <TabsTrigger
            value="details"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--chat-accent))] data-[state=active]:bg-transparent px-4 py-4"
          >
            <Info className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="threads" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {selectedMessageId ? (
                <div className="text-sm text-[hsl(var(--chat-muted))]">
                  <p>Thread view for message: {selectedMessageId}</p>
                  <p className="mt-2 text-xs">
                    Thread replies will appear here.
                  </p>
                </div>
              ) : (
                <div className="text-center text-sm text-[hsl(var(--chat-muted))] mt-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a message to view its thread</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="details" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              {/* Channel Info */}
              <div>
                <h4 className="text-sm font-semibold text-[hsl(var(--chat-text))] mb-2">
                  About this channel
                </h4>
                <p className="text-sm text-[hsl(var(--chat-muted))]">
                  Channel information and description will appear here.
                </p>
              </div>

              {/* Pinned Items */}
              <div>
                <h4 className="text-sm font-semibold text-[hsl(var(--chat-text))] mb-2">
                  Pinned Items
                </h4>
                <p className="text-sm text-[hsl(var(--chat-muted))]">
                  No pinned messages yet.
                </p>
              </div>

              {/* Members */}
              <div>
                <h4 className="text-sm font-semibold text-[hsl(var(--chat-text))] mb-2">
                  Channel Members
                </h4>
                <p className="text-sm text-[hsl(var(--chat-muted))]">
                  Member list will appear here.
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
