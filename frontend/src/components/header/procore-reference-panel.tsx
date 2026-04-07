"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProcorePanelStore } from "@/lib/stores/procore-panel-store";
import { featureFromPathname, stateLabel } from "@/lib/procore-route-map";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Screenshot {
  stateId: string;
  label: string;
  src: string;
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

interface LightboxProps {
  screenshots: Screenshot[];
  initialIndex: number;
  onClose: () => void;
}

function Lightbox({ screenshots, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex] = React.useState(initialIndex);
  const current = screenshots[index];

  // Keyboard navigation
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, screenshots.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, screenshots.length]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] max-w-[90vw] flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">
            {current.label}
            <span className="ml-2 text-white/50">
              {index + 1} / {screenshots.length}
            </span>
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image */}
        <img
          src={current.src}
          alt={current.label}
          className="max-h-[80vh] max-w-[88vw] rounded-lg object-contain shadow-2xl"
        />

        {/* Prev / Next */}
        {screenshots.length > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
              className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-1.5">
              {screenshots.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-all",
                    i === index ? "bg-white w-4" : "bg-white/40",
                  )}
                />
              ))}
            </div>
            <button
              disabled={index === screenshots.length - 1}
              onClick={() => setIndex((i) => i + 1)}
              className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function ProcoreReferencePanel() {
  const open = useProcorePanelStore((s) => s.open);
  const setOpen = useProcorePanelStore((s) => s.setOpen);
  const pathname = usePathname();

  const [screenshots, setScreenshots] = React.useState<Screenshot[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  const feature = featureFromPathname(pathname);

  // Fetch screenshot list whenever feature changes
  React.useEffect(() => {
    if (!feature || !open) return;
    setLoading(true);
    fetch(`/api/procore-screenshots/${feature}`)
      .then((r) => r.json())
      .then((data: { stateIds?: string[] }) => {
        const ids = data.stateIds ?? [];
        setScreenshots(
          ids.map((id) => ({
            stateId: id,
            label: stateLabel(id),
            src: `/api/procore-screenshots/${feature}/${id}.png`,
          })),
        );
      })
      .catch(() => setScreenshots([]))
      .finally(() => setLoading(false));
  }, [feature, open]);

  return (
    <>
      {/* Push panel */}
      <div
        className={cn(
          "flex h-full flex-col border-l border-border bg-card transition-all duration-300 ease-in-out overflow-hidden shrink-0",
          open ? "w-80" : "w-0",
        )}
        aria-hidden={!open}
      >
        {open && (
          <>
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
              <div>
                <p className="text-sm font-semibold">Procore Reference</p>
                {feature && (
                  <p className="text-xs text-muted-foreground capitalize">
                    {feature.replace(/-/g, " ")}
                  </p>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Screenshot list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {loading && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Loading screenshots…
                </div>
              )}

              {!loading && !feature && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No Procore reference available for this page.
                </div>
              )}

              {!loading && feature && screenshots.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No screenshots found for{" "}
                  <span className="font-medium capitalize">{feature.replace(/-/g, " ")}</span>.
                </div>
              )}

              {!loading &&
                screenshots.map((shot, i) => (
                  <button
                    key={shot.stateId}
                    onClick={() => setLightboxIndex(i)}
                    className="group w-full text-left rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="relative bg-muted">
                      <img
                        src={shot.src}
                        alt={shot.label}
                        className="w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-xs font-medium text-foreground">{shot.label}</p>
                    </div>
                  </button>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && screenshots.length > 0 && (
        <Lightbox
          screenshots={screenshots}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
