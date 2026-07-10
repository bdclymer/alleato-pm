"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { MobileBottomNav } from "@/components/nav/mobile-bottom-nav";
import { CollaborationProvider } from "@/components/collaboration/collaboration-provider";
import { CreateProjectDevConfigProvider } from "@/components/project/create-project-dev-config";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
import { useProject } from "@/contexts/project-context";
import { useDeferredMount } from "@/hooks/use-deferred-mount";
import { useProjectPermissions } from "@/hooks/use-project-permissions";
import { useProcorePanelStore } from "@/lib/stores/procore-panel-store";
// AdminFeedbackWidget replaced by UnifiedFeedbackWidget in root layout
import { feedbackTargetProps } from "@/lib/admin-feedback/constants";

const ProcoreReferencePanel = dynamic(
  () => import("@/components/header/procore-reference-panel").then((mod) => mod.ProcoreReferencePanel),
  { ssr: false },
);
const WelcomeOnboarding = dynamic(
  () => import("@/components/onboarding/WelcomeOnboarding").then((mod) => mod.WelcomeOnboarding),
  { ssr: false },
);
// Click-anywhere page comments (Liveblocks). Self-gates on NEXT_PUBLIC_PAGE_COMMENTS
// and comment-mode state; mounted here so it shares the app-level CollaborationProvider.
const PageCommentsOverlay = dynamic(
  () => import("@/components/comments/page-comments-overlay").then((mod) => mod.PageCommentsOverlay),
  { ssr: false },
);

/** Floating overlays extracted to a single component to avoid mixed static/dynamic children key warnings. */
function Overlays() {
  const { projectId } = useProject();
  const { userType, isLoading } = useProjectPermissions(projectId);
  const shouldMountDeferredOverlays = useDeferredMount(6_000);
  const isSubcontractor = userType?.toLowerCase() === "subcontractor";

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
  const isImmersiveChatPage =
    pathname?.startsWith("/team-chat") || pathname?.startsWith("/comments");
  const isDrawingViewer = /\/drawings\/viewer\//.test(pathname ?? "");
  const isProcoreReferenceOpen = useProcorePanelStore((state) => state.open);
  if (isImmersiveChatPage) {
    return (
      <CollaborationProvider>
        <SidebarProvider defaultOpen={false}>
          <AppSidebar />
          <SidebarInset className="h-svh overflow-hidden">
            <CreateProjectDevConfigProvider>
              {children}
            </CreateProjectDevConfigProvider>
          </SidebarInset>
          <PageCommentsOverlay />
        </SidebarProvider>
      </CollaborationProvider>
    );
  }

  return (
    <CollaborationProvider>
      <SidebarProvider defaultOpen={false}>
        {!isDrawingViewer && <AppSidebar key="app-sidebar" />}
        <SidebarInset key="app-shell" className="h-svh overflow-hidden">
          <CreateProjectDevConfigProvider>
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div
                className={
                  "flex min-h-0 min-w-0 flex-1 flex-col overflow-auto scrollbar-hide transition-[padding] duration-200 ease-out" +
                  // Clear the fixed mobile bottom nav so page content and any
                  // in-page sticky footers aren't hidden behind it. Nav is
                  // md:hidden, so the padding is too.
                  (isDrawingViewer
                    ? ""
                    : " pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0")
                }
                style={{ paddingRight: "var(--admin-feedback-sheet-offset, 0px)" }}
              >
                {!isDrawingViewer && <SiteHeader key="site-header" />}
                <main
                  id="app-main-content"
                  key="main-content"
                  className="flex min-h-0 min-w-0 flex-1 flex-col"
                  {...feedbackTargetProps("app.main-content")}
                >
                  <React.Fragment key="route-content">{children}</React.Fragment>
                </main>
                {shouldMountDeferredPanels && isProcoreReferenceOpen && (
                  <ProcoreReferencePanel key="procore-reference-panel" />
                )}
              </div>
            </div>
          </CreateProjectDevConfigProvider>
          {!isDrawingViewer && <MobileBottomNav key="mobile-bottom-nav" />}
          <Overlays key="floating-overlays" />
        </SidebarInset>
        <PageCommentsOverlay />
      </SidebarProvider>
    </CollaborationProvider>
  );
}
