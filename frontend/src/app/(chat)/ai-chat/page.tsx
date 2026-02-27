"use client";

import { useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Reasoning } from "@/components/ai-elements/reasoning";
import { Sources } from "@/components/ai-elements/sources";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Copy,
  FileText,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Hello! I'm your construction project AI assistant. I can help you with project planning, documentation, safety protocols, and more. How can I assist you today?",
  },
];

const sampleSources = [
  {
    title: "OSHA Safety Guidelines 2025",
    url: "https://osha.gov/construction/safety-2025",
    description: "Latest safety protocols for construction sites",
  },
  {
    title: "Project Management Best Practices",
    url: "https://pmi.org/construction-best-practices",
    description: "Industry standards for project execution",
  },
];

const sampleReasoning = `I'm analyzing the latest construction safety requirements and cross-referencing them with your project specifications. The key considerations include:
1. Worker safety protocols for elevated work
2. Material handling procedures
3. Environmental compliance requirements`;

export default function AIChat() {
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  const handleSubmit = async (message: { content?: string; text?: string }) => {
    const content = message.content || message.text || "";
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/rag-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          thread_id: threadId,
        }),
      });

      const data = await response.json().catch(() => ({} as Record<string, unknown>));

      if (!response.ok) {
        const errorMessage =
          typeof data.message === "string"
            ? data.message
            : `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      if (typeof data.thread_id === "string" && data.thread_id.length > 0) {
        setThreadId(data.thread_id);
      }

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          typeof data.response === "string" && data.response.trim().length > 0
            ? data.response
            : "I received your message but couldn't generate a response.",
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unexpected error";
      const fallbackResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Request failed: ${errorMessage}`,
      };
      setMessages((prev) => [...prev, fallbackResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen max-h-screen w-full flex-col overflow-hidden bg-gradient-to-br from-[#FAF8F5] via-[#FFF] to-[#F5F1ED]">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-[#E07856]/10 bg-background/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <motion.div
              className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E07856] to-[#C85A3A] shadow-lg shadow-[#E07856]/20"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="size-5 text-white" />
            </motion.div>
            <div>
              <h1 className="font-sans text-xl font-semibold tracking-tight text-[#2D2D2D]">
                Alleato AI
              </h1>
              <p className="text-xs text-[#6B6B6B]">
                Construction Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showReasoning ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowReasoning(!showReasoning)}
              className="gap-2"
            >
              <Brain className="size-4" />
              <span className="hidden sm:inline">Reasoning</span>
            </Button>
            <Button
              variant={showSources ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowSources(!showSources)}
              className="gap-2"
            >
              <FileText className="size-4" />
              <span className="hidden sm:inline">Sources</span>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Conversation Area */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <Conversation className="flex-1">
          <ConversationContent className="mx-auto w-full max-w-4xl space-y-8 px-6 py-6">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.1,
                    ease: [0.19, 1.0, 0.22, 1.0],
                  }}
                >
                  <Message from={message.role}>
                    {message.role === "assistant" && (
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#E07856] to-[#C85A3A] shadow-md shadow-[#E07856]/20">
                          <Sparkles className="size-4 text-white" />
                        </div>
                        <span className="font-medium text-sm text-[#2D2D2D]">
                          Alleato AI
                        </span>
                      </div>
                    )}

                    <MessageContent>
                      <MessageResponse>{message.content}</MessageResponse>
                    </MessageContent>

                    {message.role === "assistant" && (
                      <MessageActions className="mt-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <MessageAction tooltip="Copy">
                          <Copy className="size-4" />
                        </MessageAction>
                        <MessageAction tooltip="Good response">
                          <ThumbsUp className="size-4" />
                        </MessageAction>
                        <MessageAction tooltip="Bad response">
                          <ThumbsDown className="size-4" />
                        </MessageAction>
                        <MessageAction tooltip="Regenerate">
                          <RotateCcw className="size-4" />
                        </MessageAction>
                      </MessageActions>
                    )}
                  </Message>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Message from="assistant">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#E07856] to-[#C85A3A] shadow-md shadow-[#E07856]/20">
                        <Sparkles className="size-4 text-white" />
                      </div>
                      <span className="font-medium text-sm text-[#2D2D2D]">
                        Alleato AI
                      </span>
                    </div>
                    <MessageContent>
                      <div className="flex items-center gap-2">
                        <motion.div
                          className="size-2 rounded-full bg-[#E07856]"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.5, 1],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Number.POSITIVE_INFINITY,
                            delay: 0,
                          }}
                        />
                        <motion.div
                          className="size-2 rounded-full bg-[#E07856]"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.5, 1],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Number.POSITIVE_INFINITY,
                            delay: 0.2,
                          }}
                        />
                        <motion.div
                          className="size-2 rounded-full bg-[#E07856]"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.5, 1],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Number.POSITIVE_INFINITY,
                            delay: 0.4,
                          }}
                        />
                      </div>
                    </MessageContent>
                  </Message>
                </motion.div>
              )}
            </AnimatePresence>
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Reasoning Panel */}
        <AnimatePresence>
          {showReasoning && (
            <motion.aside
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-80 border-l border-[#E07856]/10 bg-background/80 backdrop-blur-xl"
            >
              <div className="flex h-full flex-col">
                <div className="border-b border-[#E07856]/10 p-4">
                  <h2 className="flex items-center gap-2 font-semibold text-sm text-[#2D2D2D]">
                    <Brain className="size-4" />
                    AI Reasoning
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <Reasoning>
                    <div className="space-y-3 text-sm text-[#4A4A4A]">
                      {sampleReasoning.split("\n").map((line) => (
                        <motion.p
                          key={`reasoning-${line.slice(0, 20)}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          {line}
                        </motion.p>
                      ))}
                    </div>
                  </Reasoning>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Sources Panel */}
        <AnimatePresence>
          {showSources && !showReasoning && (
            <motion.aside
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-80 border-l border-[#E07856]/10 bg-background/80 backdrop-blur-xl"
            >
              <div className="flex h-full flex-col">
                <div className="border-b border-[#E07856]/10 p-4">
                  <h2 className="flex items-center gap-2 font-semibold text-sm text-[#2D2D2D]">
                    <FileText className="size-4" />
                    Sources
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <Sources>
                    <div className="space-y-3">
                      {sampleSources.map((source) => (
                        <motion.a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="block rounded-lg border border-[#E07856]/20 bg-background p-3 shadow-sm transition-all hover:border-[#E07856]/40 hover:shadow-md"
                        >
                          <h3 className="font-medium text-sm text-[#2D2D2D]">
                            {source.title}
                          </h3>
                          <p className="mt-1 text-xs text-[#6B6B6B]">
                            {source.description}
                          </p>
                        </motion.a>
                      ))}
                    </div>
                  </Sources>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="shrink-0 border-t border-[#E07856]/10 bg-background/80 px-4 py-3 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-4xl">
          <PromptInput
            onSubmit={handleSubmit}
            className="rounded-2xl border-[#E07856]/20 bg-background shadow-lg shadow-[#E07856]/5 focus-within:border-[#E07856]/40 focus-within:ring-2 focus-within:ring-[#E07856]/20"
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Ask about your construction project..."
                className="min-h-[48px] resize-none border-0 bg-transparent px-4 py-3 text-base placeholder:text-[#9B9B9B] focus-visible:ring-0"
              />
            </PromptInputBody>
            <div className="flex items-center justify-end gap-2 border-t border-[#E07856]/10 px-4 py-2">
              <PromptInputSubmit
                className="bg-gradient-to-br from-[#E07856] to-[#C85A3A] text-white shadow-md shadow-[#E07856]/20 hover:shadow-lg hover:shadow-[#E07856]/30"
                disabled={isLoading}
              >
                <SendHorizontal className="size-4" />
                Send
              </PromptInputSubmit>
            </div>
          </PromptInput>
          <p className="mt-1.5 text-center text-xs text-[#9B9B9B]">
            AI-powered construction intelligence by Alleato
          </p>
        </div>
      </motion.div>

      {/* Decorative Elements */}
      <div className="pointer-events-none absolute top-0 right-0 size-96 bg-gradient-radial from-[#E07856]/5 via-transparent to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 size-96 bg-gradient-radial from-[#E07856]/5 via-transparent to-transparent" />
    </div>
  );
}
