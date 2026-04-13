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
import { feedbackTargetProps } from "@/lib/admin-feedback/constants";

function Overlays({ showChat }: { showChat: boolean }) {
  return (
    <>
      {showChat && <AIChatWidgetLazy />}
      <React.Suspense fallback={null}>
        <LiveCursors />
      </React.Suspense>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showChat = !pathname?.startsWith("/team-chat");

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <CreateProjectDevConfigProvider>
          <SiteHeader />
          <div
            className="flex flex-1 flex-col overflow-auto min-w-0"
            {...feedbackTargetProps("app.main-content")}
          >
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </CreateProjectDevConfigProvider>
        <Overlays showChat={showChat} />
      </SidebarInset>
    </SidebarProvider>
  );
}
