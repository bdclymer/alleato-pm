import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout";

export default function LegacyAiAgentsPage() {
  redirect("/ai/admin/agents");

  return (
    <PageShell
      title="AI Agent Registry"
      description="Redirecting to the AI admin agent registry."
    />
  );
}
