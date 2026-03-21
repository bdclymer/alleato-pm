"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
import { AIChatWidgetLazy } from "@/components/chat/ai-chat-widget-lazy";
import Footer from "@/components/layout/Footer";

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
        <main className="flex flex-1 flex-col overflow-auto min-w-0">
          {children}
        </main>
        <Footer />
        <AIChatWidgetLazy />
      </SidebarInset>
    </SidebarProvider>
  );
}
