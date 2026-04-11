"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { CreateProjectDevConfigProvider } from "@/components/project/create-project-dev-config";
import { AIChatWidgetLazy } from "@/components/chat/ai-chat-widget-lazy";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
import { ProcoreReferencePanel } from "@/components/header/procore-reference-panel";
import { SiteFooter } from "@/components/layout/site-footer";
import { LiveCursors } from "@/components/live-cursors/LiveCursors";
// AdminFeedbackWidget replaced by UnifiedFeedbackWidget in root layout
import { feedbackTargetProps } from "@/lib/admin-feedback/constants";

/** Floating overlays extracted to a single component to avoid mixed static/dynamic children key warnings. */
function Overlays({ showChat }: { showChat: boolean }) {
  return (
    <>
      {showChat && <AIChatWidgetLazy />}
      <React.Suspense fallback={null}>
        <LiveCursors />
      </React.Suspense>
      {/* AdminFeedbackWidget moved to UnifiedFeedbackWidget in root layout */}
    </>
  );
}

/**
 * Main layout with sidebar as primary navigation.
 * Sidebar starts expanded with icon-collapse mode.
 * Minimal top header provides breadcrumbs and context.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isTeamChatPage = pathname?.startsWith("/team-chat");
  const isDrawingViewer = /\/drawings\/viewer\//.test(pathname ?? "");
  const showAlleatoAIWidget =
    !pathname?.startsWith("/procore-docs") && !isTeamChatPage;

  if (isTeamChatPage) {
    return (
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset className="h-svh overflow-hidden">
          <CreateProjectDevConfigProvider>
            {children}
          </CreateProjectDevConfigProvider>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      {!isDrawingViewer && <AppSidebar />}
      <SidebarInset className="h-svh overflow-hidden">
        <CreateProjectDevConfigProvider>
          {!isDrawingViewer && <SiteHeader />}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <main
              className="flex flex-1 flex-col overflow-auto scrollbar-hide min-w-0 min-h-0"
              {...feedbackTargetProps("app.main-content")}
            >
              {children}
            </main>
            {!isDrawingViewer ? <SiteFooter /> : null}
            <ProcoreReferencePanel />
          </div>
        </CreateProjectDevConfigProvider>
        <Overlays showChat={showAlleatoAIWidget} />
      </SidebarInset>
    </SidebarProvider>
  );
}
