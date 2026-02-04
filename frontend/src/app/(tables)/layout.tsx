"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
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
        <main className="flex flex-1 flex-col gap-4 pl-4 pt-4 pb-4 overflow-auto min-w-0">
          {children}
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
