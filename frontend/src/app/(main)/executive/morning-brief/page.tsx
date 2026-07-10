import { redirect } from "next/navigation";

// The Morning Brief moved to `/daily-brief`. Keep this route as a permanent
// redirect so any existing bookmarks continue to work.
export const dynamic = "force-dynamic";

export default function MorningBriefPage() {
  redirect("/daily-brief");
}
