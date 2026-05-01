"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
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
        <div className="flex min-h-0 flex-1 flex-col overflow-auto scrollbar-hide">
          <SiteHeader />
          {/* Horizontal padding is owned by PageContainer / per-page wrappers so mobile
              and desktop get the same 16/24/32px gutter as every other route. */}
          <main className="flex flex-1 flex-col gap-4 pt-2 pb-4 min-w-0">
            {children}
          </main>
          <SiteFooter />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
