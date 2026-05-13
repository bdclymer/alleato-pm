"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { CreateProjectDevConfigProvider } from "@/components/project/create-project-dev-config";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
import { SiteFooter } from "@/components/layout/site-footer";
import { useDeferredMount } from "@/hooks/use-deferred-mount";
import { feedbackTargetProps } from "@/lib/admin-feedback/constants";

const LiveCursors = dynamic(
  () => import("@/components/live-cursors/LiveCursors").then((mod) => mod.LiveCursors),
  { ssr: false },
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shouldMountDeferredOverlays = useDeferredMount(6_000);

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
        {shouldMountDeferredOverlays && (
          <React.Suspense fallback={null}>
            <LiveCursors />
          </React.Suspense>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
