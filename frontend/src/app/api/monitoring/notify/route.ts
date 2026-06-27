import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiRouteUser } from "@/lib/supabase/server";
import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { logEvent } from "@/lib/guardrails/observability";

/**
 * Dashboard notification endpoint
 * Receives real-time updates from monitoring scripts
 */

// Simple in-memory store for recent notifications
// In production, you'd use Redis or a database
let recentNotifications: NotificationWithId[] = [];
const MAX_NOTIFICATIONS = 100;

const NotificationSchema = z.object({
  type: z.string().min(1),
  timestamp: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

type NotificationData = z.infer<typeof NotificationSchema>;

interface NotificationWithId extends NotificationData {
  id: string;
  received: string;
}

/**
 * POST: Receive notification from monitoring scripts
 */
export const POST = withApiGuardrails("/api/monitoring/notify#POST", async ({ request, requestId }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/monitoring/notify#POST",
      message: "Unauthorized monitoring notification request.",
      status: 401,
      severity: "medium",
    });
  }
  const notification = await parseJsonBody(
    request,
    NotificationSchema,
    "/api/monitoring/notify#POST",
  );

    // Add to recent notifications
    const notificationWithId: NotificationWithId = {
      id: `notif-${Date.now()}`,
      ...notification,
      received: new Date().toISOString(),
    };

    recentNotifications.unshift(notificationWithId);

    // Keep only recent notifications
    if (recentNotifications.length > MAX_NOTIFICATIONS) {
      recentNotifications = recentNotifications.slice(0, MAX_NOTIFICATIONS);
    }

  // Handle notification type-specific logic
  await handleNotificationType(notification);

  logEvent({
    event: "monitoring_notification_received",
    requestId,
    where: "/api/monitoring/notify#POST",
    details: {
      notification_type: notification.type,
      notification_id: notificationWithId.id,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Notification received",
    id: notificationWithId.id,
  });
});

/**
 * GET: Retrieve recent notifications
 */
export const GET = withApiGuardrails("/api/monitoring/notify#GET", async () => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/monitoring/notify#GET",
      message: "Unauthorized monitoring notification request.",
      status: 401,
      severity: "medium",
    });
  }
  return NextResponse.json({
    notifications: recentNotifications.slice(0, 20), // Last 20
    count: recentNotifications.length,
  });
});

/**
 * Handle different notification types
 */
async function handleNotificationType(
  notification: NotificationData
): Promise<void> {
  switch (notification.type) {
    case 'activity_log':
      break;

    case 'initiative_update':
      break;

    case 'task_completion':
      // Could trigger verification here
      break;

    case 'verification_result':
      break;

    case 'system_health':
      break;

    case 'agent_activity':
      break;

    default:
      }
}
