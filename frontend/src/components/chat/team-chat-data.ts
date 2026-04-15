export interface TeamChannel {
  id: string;
  name: string;
  topic: string;
  team: string;
  section: "channels";
  unread: number;
  memberCount: number;
  preview: string;
  lastMessageAt: string | null;
  deletable: boolean;
}

export interface TeamChatAdminUser {
  id: string;
  name: string;
}
