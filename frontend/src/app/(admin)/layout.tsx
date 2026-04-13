"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
import { AIChatWidgetLazy } from "@/components/chat/ai-chat-widget-lazy";
import { SiteFooter } from "@/components/layout/site-footer";


/**
 * Layout for all table pages.
 * Includes the full app chrome (sidebar, header, footer) for consistency.
 */
export default function TablesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <SiteHeader />
        <main className="flex flex-1 flex-col overflow-auto min-w-0 min-h-0">
          {children}
          <SiteFooter />
        </main>
        <AIChatWidgetLazy />
      </SidebarInset>
    </SidebarProvider>
  );
}
