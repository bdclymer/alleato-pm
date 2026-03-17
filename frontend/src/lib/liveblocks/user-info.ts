import { getGravatarUrl } from "@/lib/gravatar";

const LIVEBLOCKS_USER_COLORS = [
  "#2563eb",
  "#0891b2",
  "#059669",
  "#65a30d",
  "#d97706",
  "#ea580c",
  "#dc2626",
  "#c026d3",
  "#7c3aed",
];

type LiveblocksUserProfile = {
  email?: string | null;
  fullName?: string | null;
  id: string;
};

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function buildLiveblocksUserInfo(profile: LiveblocksUserProfile) {
  const email = profile.email?.trim() || "";
  const name = profile.fullName?.trim() || email || "Unknown";
  const color =
    LIVEBLOCKS_USER_COLORS[
      hashString(profile.id) % LIVEBLOCKS_USER_COLORS.length
    ];

  return {
    avatar: email ? getGravatarUrl(email, 96, "identicon") : undefined,
    color,
    name,
  };
}
