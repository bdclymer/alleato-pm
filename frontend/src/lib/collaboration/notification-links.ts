import type { CollaborationNotification } from "@/hooks/use-collaboration-notifications";

const ENTITY_ROUTE_SEGMENTS: Record<string, string> = {
  change_events: "change-events",
  invoice: "invoicing",
  invoices: "invoicing",
  rfi: "rfis",
  rfis: "rfis",
  submittal: "submittals",
  submittals: "submittals",
};

export function getCollaborationNotificationHref(
  notification: Pick<
    CollaborationNotification,
    "projectId" | "entityType" | "entityId"
  >,
) {
  if (!notification.projectId || !notification.entityType) {
    return "/team-chat";
  }

  const segment =
    ENTITY_ROUTE_SEGMENTS[notification.entityType] ?? notification.entityType;
  const suffix = notification.entityId ? `/${notification.entityId}` : "";
  return `/${notification.projectId}/${segment}${suffix}`;
}
