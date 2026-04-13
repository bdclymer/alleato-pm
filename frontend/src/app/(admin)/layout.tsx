"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Layout for admin pages.
 * Includes the full app chrome (sidebar, header, footer) for consistency.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <SiteHeader />
        <div className="flex flex-1 flex-col overflow-auto min-w-0 min-h-0">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
