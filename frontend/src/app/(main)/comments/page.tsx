"use client";

import { VeltCommentsSidebar } from "@veltdev/react";
import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { PageShell } from "@/components/layout";

export const dynamic = "force-dynamic";

export default function CommentsPage() {
  return (
    <PageShell variant="content" title="Comments">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          All page annotations across the app. Click any annotation pin to view its thread.
        </p>
        <div className="min-h-96">
          <VeltCommentsSidebar groupConfig={{ enable: true }} />
        </div>
        {/* Fallback shown when Velt has no comments yet — Velt renders its own empty state inside, but this covers the outer shell */}
        <div className="hidden">
          <EmptyState
            icon={<MessageCircle className="h-6 w-6" />}
            title="No comments yet"
            description="Use the annotation button on any page to leave a comment."
          />
        </div>
      </div>
    </PageShell>
  );
}
