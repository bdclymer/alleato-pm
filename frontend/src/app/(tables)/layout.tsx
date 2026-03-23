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
      <SidebarInset className="overflow-hidden">
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-4 overflow-auto min-w-0">
          {children}
        </main>
        <SiteFooter />
        <AIChatWidgetLazy />
      </SidebarInset>
    </SidebarProvider>
  );
}
