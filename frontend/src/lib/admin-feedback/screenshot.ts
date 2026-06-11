import { ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE } from "@/lib/admin-feedback/constants";
import { compressImageDataUrl } from "@/lib/admin-feedback/compress-image";

export async function captureTargetScreenshot(target: HTMLElement) {
  const captureRoot =
    (target.closest(
      "main, section, [role='region'], [data-feedback-id]",
    ) as HTMLElement | null) ?? target;

  const overlays = document.querySelectorAll(
    `[${ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE}], [data-radix-dialog-overlay], [role="dialog"]`,
  );
  const hidden: { el: HTMLElement; prev: string }[] = [];
  overlays.forEach((el) => {
    if (el instanceof HTMLElement) {
      hidden.push({ el, prev: el.style.visibility });
      el.style.visibility = "hidden";
    }
  });

  try {
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(captureRoot, {
      backgroundColor: "#ffffff",
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      filter: (node: HTMLElement) => {
        if (node.nodeType !== 1) return true;
        const attr = node.getAttribute?.(ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE);
        return attr !== "true";
      },
    });

    if (!dataUrl || dataUrl === "data:,") {
      throw new Error("Capture produced an empty image");
    }

    // Full-page captures (e.g. the Budget table) can be many MB as PNG, which
    // overflows the 4.5MB request-body limit on submit. Compress up front so
    // the stored/annotated screenshot stays within budget.
    return compressImageDataUrl(dataUrl);
  } finally {
    hidden.forEach(({ el, prev }) => {
      el.style.visibility = prev;
    });
  }
}
