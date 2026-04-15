"use client";

import { useRouter } from "next/navigation";
import { Trash2, ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DrawingMarkupPin } from "@/hooks/use-drawing-pins";
import { useDeleteDrawingPin } from "@/hooks/use-drawing-pins";
import { PIN_TYPE_CONFIG } from "./LinkPinModal";

// ── Status color map ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted-foreground",
  open: "bg-primary",
  in_review: "bg-warning",
  closed: "bg-success",
  void: "bg-muted-foreground",
  // coordination issue statuses
  released: "bg-primary",
  elevated: "bg-destructive",
};

function StatusDot({ status }: { status: string | null }) {
  if (!status) return null;
  const cls = STATUS_COLORS[status.toLowerCase()] ?? "bg-muted-foreground";
  return <span className={cn("h-2 w-2 rounded-full shrink-0 inline-block", cls)} />;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface DrawingLinksPanelProps {
  pins: DrawingMarkupPin[];
  projectId: string;
  drawingId: string;
  currentPage: number;
  onPinHover?: (pinId: string | null) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function DrawingLinksPanel({
  pins,
  projectId,
  drawingId,
  currentPage,
  onPinHover,
}: DrawingLinksPanelProps) {
  const router = useRouter();
  const deletePin = useDeleteDrawingPin(projectId, drawingId);

  // Group pins by type
  const grouped = pins.reduce<Record<string, DrawingMarkupPin[]>>((acc, pin) => {
    const key = pin.pin_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(pin);
    return acc;
  }, {});

  if (pins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
          <Link2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No links yet</p>
        <p className="text-xs text-muted-foreground">
          Use the pin tool in the left sidebar to link RFIs, punch items, and more.
        </p>
      </div>
    );
  }

  const navigateToEntity = (pin: DrawingMarkupPin) => {
    if (!pin.entity_id) return;
    switch (pin.pin_type) {
      case "rfi":
        router.push(`/${projectId}/rfis/${pin.entity_id}`);
        break;
      case "punch_item":
        router.push(`/${projectId}/punch-list/${pin.entity_id}`);
        break;
      case "drawing":
        router.push(`/${projectId}/drawings/viewer/${pin.entity_id}`);
        break;
      case "photo":
        router.push(`/${projectId}/photos?photoId=${pin.entity_id}`);
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-border">
      {Object.entries(grouped).map(([type, typePins]) => {
        const config = PIN_TYPE_CONFIG[type as DrawingMarkupPin["pin_type"]];
        if (!config) return null;
        return (
          <div key={type}>
            <div className="px-3 py-1.5 flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {config.label}s ({typePins.length})
              </span>
            </div>
            {typePins.map((pin) => (
              <div
                key={pin.id}
                onMouseEnter={() => onPinHover?.(pin.id)}
                onMouseLeave={() => onPinHover?.(null)}
                className={cn(
                  "group px-3 py-2 flex items-start gap-2 hover:bg-muted transition-colors cursor-default",
                  pin.page !== currentPage && "opacity-50"
                )}
              >
                {/* Color indicator */}
                <div
                  className="h-5 w-5 rounded shrink-0 flex items-center justify-center text-white mt-0.5"
                  style={{ backgroundColor: pin.color ?? config.color }}
                >
                  <span className="text-[9px] font-bold">
                    {config.label[0]}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {pin.entity_number && (
                    <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                      {pin.entity_number}
                    </p>
                  )}
                  <p className="text-xs text-foreground leading-snug truncate">
                    {pin.entity_label ?? config.label}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {pin.entity_status && <StatusDot status={pin.entity_status} />}
                    {pin.entity_status && (
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {pin.entity_status.replace("_", " ")}
                      </span>
                    )}
                    {pin.page !== currentPage && (
                      <span className="text-[10px] text-muted-foreground">
                        · Page {pin.page}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {pin.entity_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => navigateToEntity(pin)}
                      title="Open in tool"
                    >
                      <ExternalLink />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-muted"
                    onClick={() => deletePin.mutate(pin.id)}
                    title="Remove link"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
