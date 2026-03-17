"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CreateProjectDevConfigProvider } from "@/components/project/create-project-dev-config";
import { AIChatWidgetLazy } from "@/components/chat/ai-chat-widget-lazy";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
import { SiteFooter } from "@/components/layout/site-footer";
import { LiveCursors } from "@/components/live-cursors/LiveCursors";
import { CanvasComments } from "@/components/canvas-comments/CanvasComments";

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
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <CreateProjectDevConfigProvider>
          <SiteHeader />
          <main className="flex flex-1 flex-col overflow-auto min-w-0">
            {children}
            <SiteFooter />
          </main>
          <AIChatWidgetLazy />
          <React.Suspense fallback={null}>
            <LiveCursors />
          </React.Suspense>
          <React.Suspense fallback={null}>
            <CanvasComments />
          </React.Suspense>
        </CreateProjectDevConfigProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
