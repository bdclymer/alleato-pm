import "@liveblocks/client";

// Global Liveblocks type augmentation.
declare global {
  interface Liveblocks {
    // Custom user info attached at auth time in /api/liveblocks/auth. Used by
    // useUser, InboxNotification, Thread, avatars, mention suggestions, etc.
    UserMeta: {
      id: string;
      info: {
        name: string;
        email?: string;
        color?: string;
      };
    };

    // Thread metadata is optional so both commenting styles share one type:
    // per-record threads (EntityComments) carry no metadata, while page-overlay
    // pins store their anchor as { x, y } page coordinates. See
    // page-comments-overlay.tsx.
    ThreadMetadata: {
      x?: number;
      y?: number;
      // Stacking order for overlapping draggable pins (raised on open/drag).
      zIndex?: number;
    };

    // Room display info returned by `resolveRoomsInfo` (collaboration-provider).
    // Gives comment/thread inbox notifications a human name + click-through URL
    // instead of falling back to the raw room id.
    RoomInfo: {
      name: string;
      url?: string;
    };

    // Custom inbox-notification kinds (must start with `$`). Every app-domain
    // notification (AI drafts, RFI review, critical issues, deadlines, status
    // changes, budget alerts, assignments, approvals, ball-in-court, weekly
    // digests) is mirrored into the Liveblocks inbox under a single flat
    // `$alleato` kind so it renders uniformly alongside native comment/mention
    // notifications. The system of record stays in `collaboration_notifications`
    // (Teams fan-out, AI-widget interruption, dedup, learning ledger); Liveblocks
    // is the render surface. See services/notificationService.ts +
    // lib/collaboration/liveblocks-inbox.ts. activityData values must be
    // primitives (string | number | boolean).
    ActivitiesData: {
      $alleato: {
        title: string;
        body?: string;
        href?: string;
        /** The original collaboration_notifications.kind, e.g. "$deadline" or "rfi_attention". */
        notificationKind?: string;
        source?: string;
        entityType?: string;
        entityId?: string;
        projectId?: number;
      };
    };
  }
}

export {};
