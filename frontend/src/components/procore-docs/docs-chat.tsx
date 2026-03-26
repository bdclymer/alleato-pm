"use client";

/**
 * PROCORE DOCS CHAT COMPONENT
 *
 * Sidebar chat interface for asking questions about Procore documentation
 * Uses RAG (Retrieval Augmented Generation) for accurate answers
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Send,
  ExternalLink,
  Loader2,
  GripVertical,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    id: number;
    url: string;
    content: string;
    similarity: number;
  }>;
}

const MIN_WIDTH = 400;
const MAX_WIDTH = 1200;
const DEFAULT_WIDTH = 540;

export function DocsChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<number>(0);

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem("procore-docs-chat-width");
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10);
      if (parsedWidth >= MIN_WIDTH && parsedWidth <= MAX_WIDTH) {
        setWidth(parsedWidth);
      }
    }
  }, []);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = e.clientX;
  };

  // Handle resize move
  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const delta = resizeRef.current - e.clientX;
      resizeRef.current = e.clientX;

      setWidth((prevWidth) => {
        const newWidth = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, prevWidth + delta),
        );
        return newWidth;
      });
    };

    const handleResizeEnd = () => {
      if (isResizing) {
        setIsResizing(false);
        // Save width to localStorage
        localStorage.setItem("procore-docs-chat-width", width.toString());
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, width]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/procore-docs/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.error || "Failed to get response";
        throw new Error(message);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer,
        sources: data.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "Sorry, I encountered an error. Please try again.",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-sm z-50 bg-primary text-primary-foreground hover:bg-primary/90"
        size="icon"
        title="Ask Procore Docs"
      >
        <MessageCircle />
      </Button>

      {/* Chat Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="flex min-h-0 flex-col p-0"
          style={{ width: `${width}px`, maxWidth: "100vw" }}
        >
          {/* Resize Handle */}
          <button
            type="button"
            onMouseDown={handleResizeStart}
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors group z-50 border-0 bg-transparent"
            aria-label="Resize sidebar"
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-border group-hover:bg-blue-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-white" />
            </div>
          </button>

          <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <SheetTitle className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                  Procore Documentation Assistant
                </SheetTitle>
                <SheetDescription className="text-sm text-blue-700 dark:text-blue-300">
                  Ask questions about budgets, commitments, change orders, and
                  more
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Messages Area */}
          <ScrollArea className="min-h-0 flex-1 px-6 py-4">
            <div className="space-y-6 pb-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-base font-medium mb-2 text-foreground">
                    How can I help you today?
                  </p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Ask me anything about Procore features, workflows, or best
                    practices
                  </p>
                  <div className="mt-6 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Try asking:
                    </p>
                    <div className="flex flex-col gap-2">
                      {[
                        "How do I create a budget?",
                        "What are change orders?",
                        "How do commitments work?",
                      ].map((example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => setInput(example)}
                          className="text-xs px-4 py-2 rounded-lg bg-background dark:bg-gray-800 border border-border dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-left"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background dark:bg-gray-800 border border-border dark:border-gray-700 shadow-sm"
                    }`}
                  >
                    <div className="px-4 py-4">
                      {message.role === "user" ? (
                        <p className="text-sm leading-relaxed">
                          {message.content}
                        </p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-2 prose-headings:my-4 prose-headings:font-semibold prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-code:text-xs prose-code:bg-muted dark:prose-code:bg-gray-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-border dark:prose-pre:border-gray-700">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="px-4 pb-4 pt-1 border-t border-border dark:border-gray-700 mt-2">
                        <p className="text-xs font-semibold mb-2 text-foreground dark:text-gray-300 uppercase tracking-wide">
                          Sources
                        </p>
                        <div className="space-y-2">
                          {message.sources.map((source, idx) => (
                            <a
                              key={source.id}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline group transition-colors"
                            >
                              <ExternalLink className="h-3 w-3 flex-shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="flex-1">
                                <span className="font-medium">
                                  Source {idx + 1}
                                </span>
                                <span className="text-muted-foreground dark:text-muted-foreground ml-1.5">
                                  ({Math.round(source.similarity * 100)}% match)
                                </span>
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl px-4 py-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-foreground dark:text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-background dark:bg-gray-950">
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about Procore..."
                  disabled={isLoading}
                  className="flex-1 bg-background dark:bg-gray-900 border-border dark:border-gray-700 focus-visible:ring-blue-500"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  size="icon"
                >
                  <Send />
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Powered by AI • Answers from official Procore documentation
              </p>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
