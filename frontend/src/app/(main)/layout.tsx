"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { CreateProjectDevConfigProvider } from "@/components/project/create-project-dev-config";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DeferredCommentsSidebarPanel } from "@/components/header/deferred-comments-sidebar-panel";
import { useProject } from "@/contexts/project-context";
import { useDeferredMount } from "@/hooks/use-deferred-mount";
import { useProjectPermissions } from "@/hooks/use-project-permissions";
import { useProcorePanelStore } from "@/lib/stores/procore-panel-store";
// AdminFeedbackWidget replaced by UnifiedFeedbackWidget in root layout
import { feedbackTargetProps } from "@/lib/admin-feedback/constants";

const AiChatSidebarPanel = dynamic(
  () => import("@/components/ai-assistant/ai-chat-sidebar").then((mod) => mod.AiChatSidebarPanel),
  { ssr: false },
);
const GlobalAiWidget = dynamic(
  () => import("@/components/ai-assistant/global-ai-widget").then((mod) => mod.GlobalAiWidget),
  { ssr: false },
);
const ProcoreReferencePanel = dynamic(
  () => import("@/components/header/procore-reference-panel").then((mod) => mod.ProcoreReferencePanel),
  { ssr: false },
);
const WelcomeOnboarding = dynamic(
  () => import("@/components/onboarding/WelcomeOnboarding").then((mod) => mod.WelcomeOnboarding),
  { ssr: false },
);

/** Floating overlays extracted to a single component to avoid mixed static/dynamic children key warnings. */
function Overlays() {
  const { projectId } = useProject();
  const { userType, isLoading } = useProjectPermissions(projectId);
  const shouldMountDeferredOverlays = useDeferredMount(6_000);
  const isSubcontractor = userType?.toLowerCase() === "subcontractor";
  const pathname = usePathname();
  const isAiAssistant = pathname?.startsWith("/ai-assistant");

  if (!shouldMountDeferredOverlays) {
    return null;
  }

  return (
    <React.Suspense fallback={null}>
      <div className="contents">
        <WelcomeOnboarding
          deferAutoOpen={isLoading}
          suppressAutoOpen={isSubcontractor}
          suppressStorageValue="skipped:subcontractor"
        />
        {!isAiAssistant && <GlobalAiWidget />}
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
  const pathname = usePathname()!;
  const shouldMountDeferredPanels = useDeferredMount(6_000);
  const isTeamChatPage = pathname?.startsWith("/team-chat");
  const isDrawingViewer = /\/drawings\/viewer\//.test(pathname ?? "");
  const isAiAssistant = pathname?.startsWith("/ai-assistant");
  const isProcoreReferenceOpen = useProcorePanelStore((state) => state.open);
  if (isTeamChatPage) {
    return (
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset className="h-svh overflow-hidden">
          <CreateProjectDevConfigProvider>
            {children}
          </CreateProjectDevConfigProvider>
          {shouldMountDeferredPanels && (
            <React.Suspense fallback={null}>
              <GlobalAiWidget />
            </React.Suspense>
          )}
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
            {shouldMountDeferredPanels && (
              <React.Suspense fallback={null}>
                <AiChatSidebarPanel key="ai-chat-sidebar-panel" />
              </React.Suspense>
            )}
            <div className="flex min-w-0 flex-1 flex-col overflow-auto scrollbar-hide">
              {!isDrawingViewer && (
                isAiAssistant ? (
                  <div key="site-header-mobile" className="md:hidden">
                    <SiteHeader key="site-header" />
                  </div>
                ) : (
                  <SiteHeader key="site-header" />
                )
              )}
              <main
                key="main-content"
                className="flex flex-1 flex-col min-w-0 min-h-0"
                {...feedbackTargetProps("app.main-content")}
              >
                <React.Fragment key="route-content">{children}</React.Fragment>
                {!isDrawingViewer && (
                  isAiAssistant ? (
                    <div key="site-footer-desktop" className="hidden md:contents">
                      <SiteFooter key="site-footer" />
                    </div>
                  ) : (
                    <SiteFooter key="site-footer" />
                  )
                )}
              </main>
              {shouldMountDeferredPanels && isProcoreReferenceOpen && (
                <ProcoreReferencePanel key="procore-reference-panel" />
              )}
            </div>
            <DeferredCommentsSidebarPanel key="comments-sidebar-panel" />
          </div>
        </CreateProjectDevConfigProvider>
        <Overlays key="floating-overlays" />
      </SidebarInset>
    </SidebarProvider>
  );
}
