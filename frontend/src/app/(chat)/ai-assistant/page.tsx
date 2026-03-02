import { RagChatPage } from "@/components/ai-assistant/rag-chat-page";

export const metadata = {
  title: "AI Assistant | Alleato",
  description: "Chat with your meeting transcripts using AI-powered insights",
};

export default function AIAssistantPage() {
  return <RagChatPage />;
}
