import { createClient } from "@liveblocks/client";
import { createLiveblocksContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

// Liveblocks types for the application
declare global {
  interface Liveblocks {
    Presence: Record<string, never>;
    Storage: Record<string, never>;

    UserMeta: {
      id: string;
      info: {
        name: string;
        email: string;
        avatar?: string;
      };
    };

    RoomEvent: Record<string, never>;

    ThreadMetadata: {
      resolved?: boolean;
    };

    RoomInfo: {
      name: string;
      url: string;
    };
  }
}

export const {
  suspense: {
    LiveblocksProvider,
    useInboxNotifications,
    useUnreadInboxNotificationsCount,
    useMarkAllInboxNotificationsAsRead,
    useMarkInboxNotificationAsRead,
    useDeleteAllInboxNotifications,
    useDeleteInboxNotification,
    useRoomInfo,
  },
} = createLiveblocksContext(client);

export { client };
