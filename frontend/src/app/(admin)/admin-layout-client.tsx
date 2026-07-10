"use client";

import { SiteHeader } from "@/components/header";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { CollaborationProvider } from "@/components/collaboration/collaboration-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    // The shared SiteHeader renders the notification bell, which calls Liveblocks
    // hooks and throws "LiveblocksProvider is missing" without this app-level
    // provider — a hydration-time throw that froze admin pages (e.g. the Outlook
    // draft-feedback inbox stuck on skeletons). (main) wraps its tree the same way.
    <CollaborationProvider>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset className="h-svh overflow-hidden">
          <div
            className="flex min-h-0 flex-1 flex-col overflow-auto scrollbar-hide transition-[padding] duration-200 ease-out"
            style={{ paddingRight: "var(--admin-feedback-sheet-offset, 0px)" }}
          >
            <SiteHeader />
            <main
              id="app-main-content"
              className="flex min-h-0 min-w-0 flex-1 flex-col"
            >
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </CollaborationProvider>
  );
}
