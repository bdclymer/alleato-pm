import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";

// Server-Sent Events endpoint for real-time monitoring updates
export const GET = withApiGuardrails(
  "/api/monitoring/websocket#GET",
  async ({ request }) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/monitoring/websocket#GET",
      message: "Unauthorized websocket monitoring request.",
      status: 401,
      severity: "medium",
      details: authError ? { reason: authError.message } : undefined,
      cause: authError ?? undefined,
    });
  }

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel') || 'monitoring';

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'connection',
            message: 'Connected to monitoring updates',
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );

      // Simulate real-time updates (in production, this would listen to actual events)
      const interval = setInterval(() => {
        const updates = [
          {
            type: 'task_progress',
            data: {
              initiativeId: 'INI-2026-01-09-001',
              progress: Math.floor(Math.random() * 100),
              timestamp: new Date().toISOString(),
            },
          },
          {
            type: 'agent_activity',
            data: {
              agent: 'backend-architect',
              action: 'Working on Change Events database schema',
              status: 'active',
              timestamp: new Date().toISOString(),
            },
          },
          {
            type: 'verification_update',
            data: {
              initiativeId: 'INI-2026-01-09-923',
              level: 'Level 2: Functional',
              status: 'passed',
              timestamp: new Date().toISOString(),
            },
          },
          {
            type: 'system_alert',
            data: {
              severity: 'info',
              title: 'System Status Update',
              message: 'All monitoring systems operational',
              timestamp: new Date().toISOString(),
            },
          },
        ];

        const randomUpdate = updates[Math.floor(Math.random() * updates.length)];

        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(randomUpdate)}\n\n`)
          );
        } catch (error) {
          clearInterval(interval);
          controller.close();
        }
      }, 5000); // Send update every 5 seconds

      // Cleanup on connection close
      const cleanup = () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch (error) {
          // Controller already closed
        }
      };

      // Handle client disconnect
      request.signal?.addEventListener('abort', cleanup);

      // Cleanup after 5 minutes max
      setTimeout(cleanup, 5 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
},
);

const MonitoringEventSchema = z.object({
  event: z.string().min(1),
  data: z.unknown().optional(),
});

export const POST = withApiGuardrails(
  "/api/monitoring/websocket#POST",
  async ({ request }) => {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "/api/monitoring/websocket#POST",
        message: "Unauthorized websocket monitoring event request.",
        status: 401,
        severity: "medium",
        details: authError ? { reason: authError.message } : undefined,
        cause: authError ?? undefined,
      });
    }
    const body = await parseJsonBody(
      request,
      MonitoringEventSchema,
      "/api/monitoring/websocket#POST",
    );
    const { event, data } = body;

    // In a real implementation, you'd broadcast this to all connected clients
    // Simulate processing the event
    return NextResponse.json({
      success: true,
      message: 'Event broadcasted successfully',
      event,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    if (error instanceof GuardrailError) throw error;
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where: "/api/monitoring/websocket#POST",
      message: "Failed to process monitoring event.",
      status: 400,
      severity: "low",
      details: { reason: error instanceof Error ? error.message : "Unknown error" },
      cause: error instanceof Error ? error : undefined,
    });
  }
},
);

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
    },
  });
}
