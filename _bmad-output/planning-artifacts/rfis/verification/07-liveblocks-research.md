# RFIs — Liveblocks Integration Research

**Generated:** 2026-03-17

## Key Finding: Liveblocks Already Fully Set Up

The codebase has a complete Liveblocks v3 installation at `@liveblocks/*@^3.15.2` with production keys. **No new infrastructure needed** — just wire existing patterns to the RFI detail page.

## What Already Exists in Codebase

### Packages
- `@liveblocks/client`, `@liveblocks/node`, `@liveblocks/node-lexical`
- `@liveblocks/react`, `@liveblocks/react-lexical`, `@liveblocks/react-ui`
- `lexical` + all `@lexical/*` packages (rich text editor)

### Infrastructure
| Component | File | Status |
|-----------|------|--------|
| Config | `frontend/liveblocks.config.ts` | ✅ Ready |
| Types | `frontend/src/types/liveblocks.d.ts` | ✅ Ready |
| Auth endpoint | `frontend/src/app/api/liveblocks-auth/route.ts` | ✅ Ready |
| Room management | `frontend/src/app/api/liveblocks/rooms/route.ts` | ✅ Ready |
| User lookup | `frontend/src/app/api/liveblocks/users/route.ts` | ✅ Ready |
| User search (mentions) | `frontend/src/app/api/liveblocks/users/search/route.ts` | ✅ Ready |
| Webhook handler | `frontend/src/app/api/liveblocks/webhook/route.ts` | ✅ Ready |
| Room utilities | `frontend/src/lib/liveblocks/rooms.ts` | ✅ Ready |
| User info mapping | `frontend/src/lib/liveblocks/user-info.ts` | ✅ Ready |
| Notification service | `frontend/src/services/notificationService.ts` | ✅ Ready (triggerInboxNotification) |
| Notification bell | `frontend/src/components/header/notification-bell.tsx` | ✅ Ready |
| Inbox list | `frontend/src/components/liveblock/InboxNotificationList.tsx` | ✅ Ready |
| Custom notification kinds | `frontend/src/components/notifications/custom-notification-kinds.tsx` | ✅ Ready |
| Entity comments | `frontend/src/components/comments/entity-comments.tsx` | ✅ Ready |
| Entity room wrapper | `frontend/src/components/comments/entity-room.tsx` | ✅ Ready |
| CSS tokens | `frontend/src/app/globals.css` (line 1872) | ✅ Ready |
| Provider | `frontend/src/app/Providers.tsx` | ✅ Ready |

### Existing Integrations (patterns to copy from)
| Feature | Files | Pattern |
|---------|-------|---------|
| Budget cell comments | `budget/budget-table-comments-wrapper.tsx` | Cell-level comment indicators |
| Drawing annotations | `drawings/DrawingViewerWithComments.tsx`, `DrawingComments.tsx` | Visual annotation threads |
| Issue tracker | `issue-tracker/` (60+ files) | Full Liveblocks app with Lexical editor, comments, presence, inbox |
| Collaborative spreadsheet | `spreadsheet/` (30+ files) | Real-time sync + presence avatars |

## Liveblocks API Summary (for RFI implementation)

### Room Naming Convention
```
project-{projectId}:rfi-{rfiId}
```

### Thread Metadata (for RFI responses)
```typescript
ThreadMetadata: {
  entityType: "rfi";
  entityId: string;        // RFI UUID
  isOfficial?: boolean;    // Official response thread
  responseRequired?: boolean;
}
```

### Key React Components (from @liveblocks/react-ui)
| Component | Purpose |
|-----------|---------|
| `Thread` | Display a threaded comment with replies |
| `Composer` | Create a new thread/comment |
| `InboxNotification` | Render notification items |

### Key Hooks (from @liveblocks/react/suspense)
| Hook | Purpose |
|------|---------|
| `useThreads()` | Get all threads in a room |
| `useMarkThreadAsResolved()` | Resolve a thread (= close/mark official) |
| `useInboxNotifications()` | Get user's notifications |

### Server-side (from @liveblocks/node)
| Method | Purpose |
|--------|---------|
| `liveblocks.triggerInboxNotification()` | Send Ball in Court / status change notifications |
| `liveblocks.getComment()` | Fetch comment details in webhooks |
| `stringifyCommentBody()` | Convert rich text to HTML/Markdown for emails |

### Webhook Events for RFI Logic
| Event | Use Case |
|-------|----------|
| `commentCreated` | Trigger BIC shift when assignee responds |
| `threadMetadataUpdated` | Track official response designation |
| `notification` | Send email digests (30-min delay, auto-batched) |

### Pricing
- **Free**: 500 Monthly Active Rooms, 1,000 notification events
- **Pro**: $30/mo + $0.03/room overage, unlimited notifications
- Users are unlimited on all plans

## Implementation Strategy

### What We DON'T Need to Build
- ❌ `rfi_responses` database table — Liveblocks stores responses as threads
- ❌ Response API routes — Liveblocks handles CRUD
- ❌ Notification system — Already wired with bell + inbox
- ❌ Rich text editor — Lexical already integrated
- ❌ @mention system — Already working via user search endpoint
- ❌ Email notification infrastructure — Webhook + existing service

### What We DO Need to Build
- RoomProvider wrapper on RFI detail page (copy from entity-room.tsx)
- Thread list component in Responses section (use existing Thread + Composer)
- "Mark as Official" action (use thread resolve or metadata update)
- Ball in Court shift on response (webhook handler addition)
- Custom notification kind for BIC shift (add to custom-notification-kinds.tsx)
- Rich text Question field using Lexical (copy from issue-tracker Editor.tsx)

### Estimated Effort
With existing infrastructure: **1-2 days** vs 5-7 days building from scratch
