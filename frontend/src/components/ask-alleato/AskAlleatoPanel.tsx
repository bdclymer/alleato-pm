"use client";

import { MessageSquare, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE, feedbackTargetProps } from "@/lib/admin-feedback/constants";
import { AskAITab } from "./tabs/AskAITab";
import { FeedbackTab } from "./tabs/FeedbackTab";

export type AskAlleatoPanelTab = "ai" | "feedback";

export function AskAlleatoPanel({
  open,
  onOpenChange,
  activeTab,
  onActiveTabChange,
  pagePath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: AskAlleatoPanelTab;
  onActiveTabChange: (tab: AskAlleatoPanelTab) => void;
  pagePath: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-md"
        {...feedbackTargetProps("ask-alleato.panel")}
        {...{ [ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE]: "true" }}
      >
        <DialogTitle className="sr-only">Ask Alleato</DialogTitle>
        <Tabs value={activeTab} onValueChange={(value) => onActiveTabChange(value as AskAlleatoPanelTab)} className="gap-0">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-none border-b bg-transparent p-0" variant="default">
            <TabsTrigger value="ai" className="rounded-none border-b-2 border-transparent py-3 data-[state=active]:border-primary data-[state=active]:shadow-none">
              <Sparkles className="size-3.5" />
              Ask AI
            </TabsTrigger>
            <TabsTrigger value="feedback" className="rounded-none border-b-2 border-transparent py-3 data-[state=active]:border-primary data-[state=active]:shadow-none">
              <MessageSquare className="size-3.5" />
              Send feedback
            </TabsTrigger>
          </TabsList>
          <div className="p-5">
            <TabsContent value="ai" className="mt-0">
              <AskAITab />
            </TabsContent>
            <TabsContent value="feedback" className="mt-0">
              <FeedbackTab pagePath={pagePath} onSubmitted={() => onOpenChange(false)} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
