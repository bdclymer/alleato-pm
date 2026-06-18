import { redirect } from "next/navigation";

export const metadata = {
  title: "AI Skills | Alleato",
  description: "Admin review surface for Skill Library records.",
};

export const dynamic = "force-dynamic";

export default async function AdminAiSkillsPage() {
  redirect("/ai/admin/skills");
}
