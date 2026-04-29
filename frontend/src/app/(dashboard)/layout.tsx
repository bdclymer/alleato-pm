"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CreateProjectDevConfigProvider } from "@/components/project/create-project-dev-config";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
import { SiteFooter } from "@/components/layout/site-footer";
import { LiveCursors } from "@/components/live-cursors/LiveCursors";
import { feedbackTargetProps } from "@/lib/admin-feedback/constants";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <CreateProjectDevConfigProvider>
          <div className="flex min-h-0 flex-1 flex-col overflow-auto scrollbar-hide">
            <SiteHeader />
            <div
              className="flex flex-1 flex-col min-w-0"
              {...feedbackTargetProps("app.main-content")}
            >
              <div className="flex-1">{children}</div>
              <SiteFooter />
            </div>
          </div>
        </CreateProjectDevConfigProvider>
        <React.Suspense fallback={null}>
          <LiveCursors />
        </React.Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
