import { redirect } from "next/navigation";

export const metadata = {
  title: "Skill Library | Alleato",
  description: "Approved Alleato AI skills available to the assistant.",
};

export const dynamic = "force-dynamic";

export default function AiAssistantSkillsPage() {
  redirect("/ai/skills");
}
