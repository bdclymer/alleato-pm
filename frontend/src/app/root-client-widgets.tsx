"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const AskAlleatoRoot = dynamic(
  () => import("@/components/ask-alleato/AskAlleatoRoot").then((mod) => mod.AskAlleatoRoot),
  { ssr: false },
);
const AdminFeedbackWidget = dynamic(
  () => import("@/components/admin-feedback/AdminFeedbackWidget").then((mod) => mod.AdminFeedbackWidget),
  { ssr: false },
);
const AgentationThemeSync = dynamic(
  () => import("@/components/dev/AgentationThemeSync").then((mod) => mod.AgentationThemeSync),
  { ssr: false },
);
const DevAnnotationOverlay = dynamic(
  () => import("@/components/dev/dev-annotation-overlay").then((mod) => mod.DevAnnotationOverlay),
  { ssr: false },
);
const DevAutoFillForms = dynamic(
  () => import("@/components/dev/DevAutoFillForms").then((mod) => mod.DevAutoFillForms),
  { ssr: false },
);
const UnifiedFeedbackWidget = dynamic(
  () => import("@/components/dev/UnifiedFeedbackWidget").then((mod) => mod.UnifiedFeedbackWidget),
  { ssr: false },
);
const DesignViolationOverlay = dynamic(
  () => import("@/components/dev/design-violation-overlay").then((mod) => mod.DesignViolationOverlay),
  { ssr: false },
);

export function RootClientWidgets() {
  return (
    <Suspense fallback={null}>
      <AskAlleatoRoot />
      <AdminFeedbackWidget showLauncher={false} />
      {process.env.NODE_ENV === "development" && (
        <>
          <AgentationThemeSync />
          <DevAnnotationOverlay />
          <DevAutoFillForms />
          <UnifiedFeedbackWidget />
          <DesignViolationOverlay />
        </>
      )}
    </Suspense>
  );
}
