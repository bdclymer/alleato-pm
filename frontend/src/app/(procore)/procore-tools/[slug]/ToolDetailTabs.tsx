"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/dev-panel/OverviewTab";
import { SpecTab } from "@/components/dev-panel/SpecTab";
import { ScreenshotsPageTab } from "@/components/dev-panel/ScreenshotsPageTab";
import { GapsTab } from "@/components/dev-panel/GapsTab";
import { FeedbackTab } from "@/components/dev-panel/FeedbackTab";
import { ChatTab } from "@/components/dev-panel/ChatTab";

interface Props {
  slug: string;
  description: string | null;
}

// Height used only for constrained tabs (spec, gaps, feedback, chat)
const CONSTRAINED_HEIGHT = "h-[calc(100vh-320px)] min-h-[480px]";

export function ToolDetailTabs({ slug, description }: Props) {
  return (
    <div className="mt-4">
      {description && (
        <p className="mb-6 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
          <TabsTrigger value="spec">Spec</TabsTrigger>
          <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="chat">Ask AI</TabsTrigger>
        </TabsList>

        {/* Overview + Screenshots — full-page scroll, no height cap */}
        <TabsContent value="overview" className="m-0">
          <OverviewTab feature={slug} />
        </TabsContent>

        <TabsContent value="screenshots" className="m-0">
          <ScreenshotsPageTab feature={slug} />
        </TabsContent>

        {/* All other tabs keep their fixed viewport height */}
        <div className={`overflow-hidden ${CONSTRAINED_HEIGHT}`}>
          <TabsContent value="spec" className="h-full m-0">
            <SpecTab feature={slug} />
          </TabsContent>

          <TabsContent value="gaps" className="h-full m-0">
            <GapsTab feature={slug} />
          </TabsContent>

          <TabsContent value="feedback" className="h-full m-0">
            <FeedbackTab feature={slug} />
          </TabsContent>

          <TabsContent value="chat" className="h-full m-0">
            <ChatTab feature={slug} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
