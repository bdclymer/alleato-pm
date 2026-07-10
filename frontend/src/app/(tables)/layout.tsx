"use client";

import * as React from "react";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { MobileBottomNav } from "@/components/nav/mobile-bottom-nav";
import { CollaborationProvider } from "@/components/collaboration/collaboration-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";

export default function TablesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // CollaborationProvider mirrors the (main) shell so the bottom nav's Alerts
    // badge (Liveblocks unread count) resolves on table pages instead of
    // falling back through its error boundary.
    <CollaborationProvider>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset className="h-svh overflow-hidden">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div
              className="flex min-h-0 flex-1 flex-col overflow-auto scrollbar-hide transition-[padding] duration-200 ease-out pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
              style={{ paddingRight: "var(--admin-feedback-sheet-offset, 0px)" }}
            >
              {/* Mobile is app-style: bottom nav owns navigation, header is desktop-only. */}
              <div className="hidden md:contents">
                <SiteHeader />
              </div>
              <main
                id="app-main-content"
                className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 pb-4 pt-2"
              >
                {children}
              </main>
            </div>
          </div>
          <MobileBottomNav />
        </SidebarInset>
      </SidebarProvider>
    </CollaborationProvider>
  );
}
