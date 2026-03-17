"use client";

import { useCallback, useEffect, useState } from "react";
import { CommentPin, FloatingComposer } from "@liveblocks/react-ui";
import { useSelf } from "@liveblocks/react/suspense";
import { usePathname } from "next/navigation";
import { useMaxZIndex } from "./useMaxZIndex";

interface PlaceThreadButtonProps {
  isActive: boolean;
  onDeactivate: () => void;
}

export function PlaceThreadButton({ isActive, onDeactivate }: PlaceThreadButtonProps) {
  const [state, setState] = useState<"idle" | "placing" | "placed">("idle");
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  // Reset when parent deactivates comment mode
  useEffect(() => {
    if (!isActive) {
      setState("idle");
      setCoords({ x: 0, y: 0 });
    }
  }, [isActive]);

  const reset = useCallback(() => {
    setState("idle");
    setCoords({ x: 0, y: 0 });
  }, []);

  const handleSubmit = useCallback(() => {
    setState("idle");
    setCoords({ x: 0, y: 0 });
  }, []);

  if (!isActive) return null;

  return (
    <>
      {/* Dimmed backdrop — click to cancel */}
      <div
        className="fixed inset-0 bg-black/10 z-[9998]"
        style={{ pointerEvents: state === "placing" ? "none" : "auto" }}
        onClick={reset}
        onContextMenu={(e) => { e.preventDefault(); reset(); }}
      />

      {/* Placement layer — captures where user clicks */}
      {state !== "placed" && (
        <div
          className="fixed inset-0 z-[9999]"
          style={{ cursor: "none" }}
          onClick={(e) => {
            setCoords({ x: e.clientX, y: e.clientY });
            setState("placed");
          }}
          onContextMenu={(e) => { e.preventDefault(); onDeactivate(); }}
        >
          <NewThreadCursor />
        </div>
      )}

      {/* FloatingComposer placed at click coords */}
      {state === "placed" && (
        <ThreadComposer
          coords={coords}
          onSubmit={handleSubmit}
          onCancel={onDeactivate}
        />
      )}
    </>
  );
}

// ── ThreadComposer ────────────────────────────────────────────────────────────

function ThreadComposer({
  coords,
  onSubmit,
  onCancel,
}: {
  coords: { x: number; y: number };
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const creatorId = useSelf((me) => me.id);
  const maxZIndex = useMaxZIndex();
  const pathname = usePathname();

  return (
    <FloatingComposer
      defaultOpen
      metadata={{
        x: coords.x,
        y: coords.y,
        zIndex: maxZIndex + 1,
        url: pathname ?? "/",
      }}
      onComposerSubmit={onSubmit}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 99999,
        transform: `translate(${coords.x}px, ${coords.y}px)`,
        pointerEvents: "auto",
      }}
    >
      <CommentPin
        userId={creatorId ?? undefined}
        corner="top-left"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          transform: `translate(${coords.x}px, ${coords.y}px)`,
          zIndex: 99998,
          cursor: "default",
        }}
      />
    </FloatingComposer>
  );
}

// ── Cursor that follows mouse in placing mode ─────────────────────────────────

function NewThreadCursor() {
  const [pos, setPos] = useState({ x: -10000, y: -10000 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseenter", onMove);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseenter", onMove);
    };
  }, []);

  return (
    <CommentPin
      corner="top-left"
      style={{
        cursor: "none",
        position: "fixed",
        top: 0,
        left: 0,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        zIndex: 99999999,
        pointerEvents: "none",
      }}
    />
  );
}
