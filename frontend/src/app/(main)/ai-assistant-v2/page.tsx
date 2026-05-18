import { PageShell } from "@/components/layout";
import { AdvisorChat } from "@/components/ai-assistant-v2/advisor-chat";

export const metadata = {
  title: "AI Assistant v2 | Alleato",
  description: "Strategic advisor powered by the alleato-ai LangGraph service",
};

export default function AIAssistantV2Page() {
  return (
    <PageShell variant="content" title="AI Assistant v2">
      <AdvisorChat />
    </PageShell>
  );
}
