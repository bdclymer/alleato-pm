"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { CreateProjectDevConfigProvider } from "@/components/project/create-project-dev-config";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ProcoreReferencePanel } from "@/components/header/procore-reference-panel";
import { CommentsSidebarPanel } from "@/components/header/comments-sidebar";
import { LiveCursors } from "@/components/live-cursors/LiveCursors";
import { WelcomeOnboarding } from "@/components/onboarding/WelcomeOnboarding";
import { useProject } from "@/contexts/project-context";
import { useProjectPermissions } from "@/hooks/use-project-permissions";
// AdminFeedbackWidget replaced by UnifiedFeedbackWidget in root layout
import { feedbackTargetProps } from "@/lib/admin-feedback/constants";

/** Floating overlays extracted to a single component to avoid mixed static/dynamic children key warnings. */
function Overlays() {
  const { projectId } = useProject();
  const { userType, isLoading } = useProjectPermissions(projectId);
  const isSubcontractor = userType?.toLowerCase() === "subcontractor";

  return (
    <React.Suspense fallback={null}>
      <div className="contents">
        <LiveCursors />
        <WelcomeOnboarding
          deferAutoOpen={isLoading}
          suppressAutoOpen={isSubcontractor}
          suppressStorageValue="skipped:subcontractor"
        />
      </div>
    </React.Suspense>
  );
}

/**
 * Main layout with sidebar as primary navigation.
 * Sidebar starts expanded with icon-collapse mode.
 * Minimal top header provides breadcrumbs and context.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isTeamChatPage = pathname?.startsWith("/team-chat");
  const isDrawingViewer = /\/drawings\/viewer\//.test(pathname ?? "");
  if (isTeamChatPage) {
    return (
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset className="h-svh overflow-hidden">
          <CreateProjectDevConfigProvider>
            {children}
          </CreateProjectDevConfigProvider>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      {!isDrawingViewer && <AppSidebar key="app-sidebar" />}
      <SidebarInset key="app-shell" className="h-svh overflow-hidden">
        <CreateProjectDevConfigProvider>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col overflow-auto scrollbar-hide">
              {!isDrawingViewer && <SiteHeader key="site-header" />}
              <main
                key="main-content"
                className="flex flex-1 flex-col min-w-0 min-h-0"
                {...feedbackTargetProps("app.main-content")}
              >
                <React.Fragment key="route-content">{children}</React.Fragment>
                {!isDrawingViewer && <SiteFooter key="site-footer" />}
              </main>
              <ProcoreReferencePanel key="procore-reference-panel" />
            </div>
            <React.Suspense fallback={null}>
              <CommentsSidebarPanel key="comments-sidebar-panel" />
            </React.Suspense>
          </div>
        </CreateProjectDevConfigProvider>
        <Overlays key="floating-overlays" />
      </SidebarInset>
    </SidebarProvider>
  );
}
