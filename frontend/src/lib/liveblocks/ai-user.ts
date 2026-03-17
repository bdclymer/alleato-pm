/**
 * The synthetic user ID used by the Alleato AI assistant in Liveblocks threads.
 * When a comment mentions @Alleato AI, the webhook fires and the AI replies
 * under this user ID.
 */
export const AI_USER_ID = "__alleato_ai__";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.LIVEBLOCKS_NOTIFICATION_BASE_URL ??
  "https://alleato-hub.vercel.app";

/** Display info returned by /api/liveblocks/users when resolving the AI user */
export const AI_USER_INFO = {
  name: "Alleato AI",
  avatar: `${baseUrl.replace(/\/$/, "")}/alleato-ai-avatar.svg`,
  color: "#6366f1", // indigo
} as const;
