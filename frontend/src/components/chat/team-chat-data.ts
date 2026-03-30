export interface TeamChannel {
  id: string;
  name: string;
  topic: string;
  team: string;
  section: "favorites" | "channels" | "direct";
  unread: number;
  memberCount: number;
  preview: string;
}

export const TEAM_CHANNELS: TeamChannel[] = [
  {
    id: "general",
    name: "General",
    topic: "Company updates, priorities, and broad announcements",
    team: "Alleato HQ",
    section: "favorites",
    unread: 3,
    memberCount: 28,
    preview: "Updated milestone plan posted this morning.",
  },
  {
    id: "project-updates",
    name: "Project Updates",
    topic: "Daily progress updates from active project teams",
    team: "Alexandria Project",
    section: "channels",
    unread: 5,
    memberCount: 14,
    preview: "MEP rough-in complete on floors 3 and 4.",
  },
  {
    id: "support",
    name: "Field Support",
    topic: "Coordination between office, field, and vendors",
    team: "Operations",
    section: "channels",
    unread: 1,
    memberCount: 10,
    preview: "Need confirmation on the revised delivery sequence.",
  },
  {
    id: "design-squad",
    name: "Design Squad",
    topic: "Design QA and rollout planning",
    team: "Product",
    section: "favorites",
    unread: 0,
    memberCount: 7,
    preview: "New table density options are ready for review.",
  },
  {
    id: "estimating-sync",
    name: "Estimating Sync",
    topic: "Bid strategy and scope clarifications",
    team: "Preconstruction",
    section: "channels",
    unread: 2,
    memberCount: 9,
    preview: "Three alternates need pricing by Wednesday.",
  },
  {
    id: "mona-kane",
    name: "Mona Kane",
    topic: "Direct message",
    team: "Direct Message",
    section: "direct",
    unread: 0,
    memberCount: 2,
    preview: "Can you review the owner-facing recap before 4?",
  },
  {
    id: "charlotte-crum",
    name: "Charlotte de Crum",
    topic: "Direct message",
    team: "Direct Message",
    section: "direct",
    unread: 1,
    memberCount: 2,
    preview: "I dropped comments on the campaign draft.",
  },
];

export function getTeamChannel(channelId: string): TeamChannel {
  return (
    TEAM_CHANNELS.find((channel) => channel.id === channelId) ?? {
      id: channelId,
      name: channelId,
      topic: "Team discussion",
      team: "Team",
      section: "channels",
      unread: 0,
      memberCount: 0,
      preview: "",
    }
  );
}
