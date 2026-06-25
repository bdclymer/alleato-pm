"use client";

import * as React from "react";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function TablesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div
            className="flex min-h-0 flex-1 flex-col overflow-auto scrollbar-hide transition-[padding] duration-200 ease-out"
            style={{ paddingRight: "var(--admin-feedback-sheet-offset, 0px)" }}
          >
            <SiteHeader />
            <main
              id="app-main-content"
              className="flex flex-1 flex-col gap-4 pt-2 pb-4 min-w-0"
            >
              {children}
            </main>
            <SiteFooter />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
