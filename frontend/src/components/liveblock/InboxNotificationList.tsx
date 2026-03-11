import { InboxNotification, InboxNotificationList } from "@liveblocks/react-ui";
import { useInboxNotifications } from "../liveblocks.config";

export function NotificationInbox() {
  const { inboxNotifications } = useInboxNotifications();

  return (
    <InboxNotificationList>
      {inboxNotifications.map((inboxNotification) => (
        <InboxNotification
          key={inboxNotification.id}
          inboxNotification={inboxNotification}
        />
      ))}
    </InboxNotificationList>
  );
}