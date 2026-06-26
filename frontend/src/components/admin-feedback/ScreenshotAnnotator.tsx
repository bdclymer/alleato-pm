"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Pen, RotateCcw, Square, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Tool = "arrow" | "rect" | "pen";
type Color = "#ef4444" | "#eab308" | "#3b82f6";
type Point = { x: number; y: number };

type Shape =
  | { kind: "arrow"; from: Point; to: Point; color: Color }
  | { kind: "rect"; from: Point; to: Point; color: Color }
  | { kind: "pen"; points: Point[]; color: Color };

type InProgress =
  | { kind: "arrow"; from: Point; to: Point }
  | { kind: "rect"; from: Point; to: Point }
  | { kind: "pen"; points: Point[] };

const COLORS: { value: Color; label: string }[] = [
  { value: "#ef4444", label: "Red" },
  { value: "#eab308", label: "Yellow" },
  { value: "#3b82f6", label: "Blue" },
];

function drawArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point, color: string) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 4) return;
  const headLen = Math.min(22, len * 0.45);
  const angle = Math.atan2(dy, dx);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(
    to.x - headLen * 0.6 * Math.cos(angle),
    to.y - headLen * 0.6 * Math.sin(angle),
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - headLen * Math.cos(angle - Math.PI / 6),
    to.y - headLen * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    to.x - headLen * Math.cos(angle + Math.PI / 6),
    to.y - headLen * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function drawRect(ctx: CanvasRenderingContext2D, from: Point, to: Point, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
}

function drawPen(ctx: CanvasRenderingContext2D, points: Point[], color: string) {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

function render(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  inProgress: InProgress | null,
  activeColor: Color,
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const s of shapes) {
    if (s.kind === "arrow") drawArrow(ctx, s.from, s.to, s.color);
    else if (s.kind === "rect") drawRect(ctx, s.from, s.to, s.color);
    else if (s.kind === "pen") drawPen(ctx, s.points, s.color);
  }
  if (inProgress) {
    if (inProgress.kind === "arrow") drawArrow(ctx, inProgress.from, inProgress.to, activeColor);
    else if (inProgress.kind === "rect") drawRect(ctx, inProgress.from, inProgress.to, activeColor);
    else if (inProgress.kind === "pen") drawPen(ctx, inProgress.points, activeColor);
  }
}

function scalePoint(p: Point, sx: number, sy: number): Point {
  return { x: p.x * sx, y: p.y * sy };
}

function scaleShape(s: Shape, sx: number, sy: number): Shape {
  if (s.kind === "arrow") return { ...s, from: scalePoint(s.from, sx, sy), to: scalePoint(s.to, sx, sy) };
  if (s.kind === "rect") return { ...s, from: scalePoint(s.from, sx, sy), to: scalePoint(s.to, sx, sy) };
  return { ...s, points: s.points.map((p) => scalePoint(p, sx, sy)) };
}

export function ScreenshotAnnotator({
  dataUrl,
  onChange,
}: {
  dataUrl: string;
  onChange: (annotatedDataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isDrawing = useRef(false);
  const [tool, setTool] = useState<Tool>("arrow");
  const [color, setColor] = useState<Color>("#ef4444");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [inProgress, setInProgress] = useState<InProgress | null>(null);

  // Sync canvas size to display size of the image
  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const sync = () => {
      canvas.width = img.offsetWidth;
      canvas.height = img.offsetHeight;
    };
    if (img.complete) sync();
    else img.addEventListener("load", sync, { once: true });
    const ro = new ResizeObserver(sync);
    ro.observe(img);
    return () => ro.disconnect();
  }, []);

  // Re-render on every state change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    render(ctx, shapes, inProgress, color);
  }, [shapes, inProgress, color]);

  const flatten = useCallback(
    (finalShapes: Shape[]) => {
      const img = imgRef.current;
      if (!img) return;
      const offscreen = document.createElement("canvas");
      offscreen.width = img.naturalWidth;
      offscreen.height = img.naturalHeight;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const sx = img.naturalWidth / img.offsetWidth;
      const sy = img.naturalHeight / img.offsetHeight;
      render(ctx, finalShapes.map((s) => scaleShape(s, sx, sy)), null, color);
      onChange(offscreen.toDataURL("image/png"));
    },
    [color, onChange],
  );

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawing.current = true;
    const pos = getPos(e);
    if (tool === "arrow") setInProgress({ kind: "arrow", from: pos, to: pos });
    else if (tool === "rect") setInProgress({ kind: "rect", from: pos, to: pos });
    else setInProgress({ kind: "pen", points: [pos] });
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !inProgress) return;
    const pos = getPos(e);
    if (inProgress.kind === "arrow") setInProgress({ ...inProgress, to: pos });
    else if (inProgress.kind === "rect") setInProgress({ ...inProgress, to: pos });
    else setInProgress({ ...inProgress, points: [...inProgress.points, pos] });
  };

  const commit = () => {
    if (!isDrawing.current || !inProgress) return;
    isDrawing.current = false;
    let shape: Shape | null = null;
    if (
      inProgress.kind === "arrow" &&
      (inProgress.to.x !== inProgress.from.x || inProgress.to.y !== inProgress.from.y)
    ) {
      shape = { ...inProgress, color };
    } else if (
      inProgress.kind === "rect" &&
      (inProgress.to.x !== inProgress.from.x || inProgress.to.y !== inProgress.from.y)
    ) {
      shape = { ...inProgress, color };
    } else if (inProgress.kind === "pen" && inProgress.points.length > 1) {
      shape = { ...inProgress, color };
    }
    setInProgress(null);
    if (shape) {
      const next = [...shapes, shape];
      setShapes(next);
      flatten(next);
    }
  };

  const undo = () => {
    const next = shapes.slice(0, -1);
    setShapes(next);
    if (next.length === 0) onChange(dataUrl);
    else flatten(next);
  };

  const clear = () => {
    setShapes([]);
    onChange(dataUrl);
  };

  const tools: { value: Tool; label: string; icon: typeof Pen }[] = [
    { value: "arrow", label: "Arrow", icon: ArrowUpRight },
    { value: "rect", label: "Rectangle", icon: Square },
    { value: "pen", label: "Freehand", icon: Pen },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1 px-1.5 py-1">
        {tools.map(({ value, label, icon: Icon }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setTool(value)}
                aria-label={label}
                aria-pressed={tool === value}
                className={cn(
                  "rounded-full text-muted-foreground hover:text-foreground",
                  tool === value && "bg-muted text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}

        <span className="mx-1 h-4 w-px bg-border/70" />

        {COLORS.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setColor(value)}
            aria-label={label}
            aria-pressed={color === value}
            className={cn(
              "size-7 rounded-full transition-transform",
              color === value && "scale-110",
            )}
          >
            <span
              className={cn(
                "size-3.5 rounded-full ring-offset-2 ring-offset-card transition-all",
                color === value
                  ? "ring-2 ring-foreground"
                  : "opacity-60 hover:opacity-100",
              )}
              style={{ backgroundColor: value }}
            />
          </Button>
        ))}

        <span className="mx-1 h-4 w-px bg-border/70" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={undo}
              disabled={shapes.length === 0}
              aria-label="Undo"
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={clear}
              disabled={shapes.length === 0}
              aria-label="Clear all"
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear all</TooltipContent>
        </Tooltip>
      </div>

      <div
        className="relative w-full select-none overflow-hidden rounded-lg border border-border/60"
        style={{ cursor: "crosshair" }}
      >
        <img
          ref={imgRef}
          src={dataUrl}
          alt="Annotate screenshot"
          className="block w-full object-contain object-top pointer-events-none"
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={commit}
          onMouseLeave={commit}
        />
      </div>
    </div>
  );
}
