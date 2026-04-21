import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import QRCode from "qrcode";

export const GET = withApiGuardrails(
  "projects/[projectId]/drawings/[drawingId]/qr-code#GET",
  async ({ request, params }) => {
    const { projectId, drawingId } = params as { projectId: string; drawingId: string };
    const projectIdNum = Number(projectId);
    if (isNaN(projectIdNum)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/drawings/[drawingId]/qr-code#GET",
        message: "Unauthorized",
        status: 401,
      });
    }

    // Verify drawing exists and belongs to project
    const { data: drawing, error: drawError } = await supabase
      .from("drawings")
      .select("id, drawing_number")
      .eq("id", drawingId)
      .eq("project_id", projectIdNum)
      .single();

    if (drawError || !drawing) {
      return NextResponse.json({ error: "Drawing not found" }, { status: 404 });
    }

    // Build the deep-link URL to the viewer
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const viewerUrl = `${appUrl}/${projectId}/drawings/viewer/${drawingId}`;

    // Generate QR code as PNG buffer
    const pngBuffer = await QRCode.toBuffer(viewerUrl, {
      type: "png",
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return new NextResponse(pngBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": `inline; filename="${drawing.drawing_number}-qr.png"`,
      },
    });
  },
);
