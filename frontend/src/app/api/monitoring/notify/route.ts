import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard notification endpoint
 * Receives real-time updates from monitoring scripts
 */

// Simple in-memory store for recent notifications
// In production, you'd use Redis or a database
let recentNotifications: NotificationWithId[] = [];
const MAX_NOTIFICATIONS = 100;

interface NotificationData {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface NotificationWithId extends NotificationData {
  id: string;
  received: string;
}

/**
 * POST: Receive notification from monitoring scripts
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const notification: NotificationData = await request.json();

    // Validate required fields
    if (!notification.type || !notification.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: type, timestamp' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      message: 'Notification received',
      id: notificationWithId.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process notification' },
      { status: 500 }
    );
  }
}

/**
 * GET: Retrieve recent notifications
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
      notifications: recentNotifications.slice(0, 20), // Last 20
      count: recentNotifications.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

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
