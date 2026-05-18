"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { useCommentsSidebarStore } from "@/lib/stores/comments-sidebar-store";

const CommentsSidebarPanel = dynamic(
  () => import("@/components/header/comments-sidebar").then((mod) => mod.CommentsSidebarPanel),
  { ssr: false },
);

export function DeferredCommentsSidebarPanel() {
  const open = useCommentsSidebarStore((s) => s.open);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }

    const timeout = window.setTimeout(() => setMounted(false), 350);
    return () => window.clearTimeout(timeout);
  }, [open]);

  if (!mounted) return null;

  return (
    <React.Suspense fallback={null}>
      <CommentsSidebarPanel />
    </React.Suspense>
  );
}
