"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { CreateProjectDevConfigProvider } from "@/components/project/create-project-dev-config";
import { AIChatWidgetLazy } from "@/components/chat/ai-chat-widget-lazy";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
import { SiteFooter } from "@/components/layout/site-footer";
import { LiveCursors } from "@/components/live-cursors/LiveCursors";
import { AdminFeedbackWidget } from "@/components/admin-feedback/AdminFeedbackWidget";
import { feedbackTargetProps } from "@/lib/admin-feedback/constants";

/** Floating overlays extracted to a single component to avoid mixed static/dynamic children key warnings. */
function Overlays({ showChat }: { showChat: boolean }) {
  return (
    <>
      {showChat && <AIChatWidgetLazy />}
      <React.Suspense fallback={null}>
        <LiveCursors />
      </React.Suspense>
      <React.Suspense fallback={null}>
        <AdminFeedbackWidget />
      </React.Suspense>
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
  const showAlleatoAIWidget = !pathname?.startsWith("/procore-docs");

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <CreateProjectDevConfigProvider>
          <SiteHeader />
          <main
            className="flex flex-1 flex-col overflow-auto min-w-0"
            {...feedbackTargetProps("app.main-content")}
          >
            {children}
            <SiteFooter />
          </main>
        </CreateProjectDevConfigProvider>
        <Overlays showChat={showAlleatoAIWidget} />
      </SidebarInset>
    </SidebarProvider>
  );
}
