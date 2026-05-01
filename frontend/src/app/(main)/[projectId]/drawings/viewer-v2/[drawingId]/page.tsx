"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { useDrawing } from "@/hooks/use-drawings";

const OsdDrawingViewer = dynamic(
  () =>
    import("@/components/drawings/OsdDrawingViewer").then((m) => ({
      default: m.OsdDrawingViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

export default function DrawingViewerV2Page() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const drawingId = params.drawingId as string;

  const { data: drawing, isLoading, error } = useDrawing(projectId, drawingId);

  const proxyFileUrl = drawing?.current_revision?.file_url
    ? `/api/projects/${projectId}/drawings/${drawingId}/pdf-proxy`
    : null;

  return (
    <PageShell
      variant="table"
      title="Drawing Viewer (v2 prototype)"
      showHeader={false}
      className="h-screen overflow-hidden bg-background !px-0 !py-0"
      contentClassName="h-full"
    >
      <div className="flex flex-col h-full bg-background">
      <header className="flex items-center gap-3 px-4 py-2.5 border-b bg-card">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${projectId}/drawings`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Drawings
        </Button>

        <div className="flex items-center gap-2 min-w-0">
          {drawing?.drawing_number && (
            <span className="text-xs text-muted-foreground shrink-0">
              {drawing.drawing_number}
            </span>
          )}
          <span className="text-sm font-medium truncate">
            {drawing?.title ?? (isLoading ? "Loading…" : "Drawing")}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
            <Sparkles className="h-3 w-3" />
            v2 prototype — OpenSeadragon
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${projectId}/drawings/viewer/${drawingId}`}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Compare to v1
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        {error ? (
          <ErrorState title="Failed to load drawing" error={error} />
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !proxyFileUrl ? (
          <ErrorState
            title="Drawing has no file attached"
            description="This drawing does not have a current revision with an uploaded PDF. Upload a revision to view it."
          />
        ) : (
          <OsdDrawingViewer fileUrl={proxyFileUrl} className="h-full" />
        )}
      </div>
      </div>
    </PageShell>
  );
}
