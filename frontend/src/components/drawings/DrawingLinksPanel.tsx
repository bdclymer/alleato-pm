"use client";

import { useRouter } from "next/navigation";
import { Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DrawingMarkupPin } from "@/hooks/use-drawing-pins";
import { useDeleteDrawingPin } from "@/hooks/use-drawing-pins";
import { PIN_TYPE_CONFIG } from "./LinkPinModal";

// ── Status color map ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-500",
  open: "bg-blue-500",
  in_review: "bg-yellow-500",
  closed: "bg-green-500",
  void: "bg-zinc-600",
  // coordination issue statuses
  released: "bg-blue-500",
  elevated: "bg-red-500",
};

function StatusDot({ status }: { status: string | null }) {
  if (!status) return null;
  const cls = STATUS_COLORS[status.toLowerCase()] ?? "bg-zinc-500";
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
        <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center mb-3">
          <span className="text-zinc-400 text-lg">🔗</span>
        </div>
        <p className="text-sm font-medium text-zinc-300 mb-1">No links yet</p>
        <p className="text-xs text-zinc-500">
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
      default:
        break;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-zinc-700/50">
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
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                {config.label}s ({typePins.length})
              </span>
            </div>
            {typePins.map((pin) => (
              <div
                key={pin.id}
                onMouseEnter={() => onPinHover?.(pin.id)}
                onMouseLeave={() => onPinHover?.(null)}
                className={cn(
                  "group px-3 py-2 flex items-start gap-2 hover:bg-zinc-700/40 transition-colors cursor-default",
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
                    <p className="text-[10px] text-zinc-500 leading-none mb-0.5">
                      {pin.entity_number}
                    </p>
                  )}
                  <p className="text-xs text-zinc-200 leading-snug truncate">
                    {pin.entity_label ?? config.label}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {pin.entity_status && <StatusDot status={pin.entity_status} />}
                    {pin.entity_status && (
                      <span className="text-[10px] text-zinc-500 capitalize">
                        {pin.entity_status.replace("_", " ")}
                      </span>
                    )}
                    {pin.page !== currentPage && (
                      <span className="text-[10px] text-zinc-500">
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
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-zinc-600"
                      onClick={() => navigateToEntity(pin)}
                      title="Open in tool"
                    >
                      <ExternalLink />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400 hover:bg-zinc-600"
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
