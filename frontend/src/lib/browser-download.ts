"use client";

export async function triggerBrowserDownload(
  url: string,
  filename?: string,
  expectedContentTypePrefix?: string,
) {
  const response = await fetch(url, { credentials: "same-origin" });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Download failed (${response.status})`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (expectedContentTypePrefix && !contentType.startsWith(expectedContentTypePrefix)) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Unexpected download type: ${contentType || "unknown"}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.rel = "noopener";

  if (filename && filename.trim().length > 0) {
    link.download = filename;
  } else {
    link.setAttribute("download", "");
  }

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
