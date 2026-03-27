"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
const syntaxHighlighterStyle = oneDark as Record<string, unknown>;

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function SimpleChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call the RAG chat API endpoint
      const response = await fetch("/api/rag-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.map((m) => ({
            role: m.role,
            text: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response || data.message || "No response received",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Log retrieved documents if any
      if (data.retrieved && data.retrieved.length > 0) {
        }
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Failed to send message"}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-info" />
            <h1 className="text-lg font-semibold">Alleato AI Assistant</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={clearChat}>
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-8">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <Bot className="h-12 w-12 text-gray-300 mb-4" />
                  <h2 className="text-2xl font-medium text-foreground mb-2">
                    How can I help you today?
                  </h2>
                  <p className="text-foreground mb-8 max-w-lg">
                    I can help you with questions about your projects, tasks,
                    meetings, and more.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                    {[
                      "Show me active projects",
                      "What are my recent tasks?",
                      "Summarize latest meetings",
                      "Help me plan a project",
                    ].map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        onClick={() => setInput(prompt)}
                        className="text-left p-4 h-auto rounded-lg hover:bg-muted transition-colors justify-start"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {prompt}
                        </p>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <div key={index} className="group">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          {message.role === "user" ? (
                            <div className="w-8 h-8 bg-gray-600 rounded-sm flex items-center justify-center">
                              <User className="h-5 w-5 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-info rounded-sm flex items-center justify-center">
                              <Bot className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="font-semibold text-sm mb-1">
                            {message.role === "user" ? "You" : "Alleato AI"}
                          </div>
                          {message.role === "assistant" ? (
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  code({
                                    node,
                                    className,
                                    children,
                                    ...props
                                  }) {
                                    const match = /language-(\w+)/.exec(
                                      className || "",
                                    );
                                    const inline = !match;
                                    return !inline && match ? (
                                      <SyntaxHighlighter
                                        style={syntaxHighlighterStyle as any}
                                        language={match[1]}
                                        PreTag="div"
                                        className="rounded-md my-2"
                                      >
                                        {String(children).replace(/\n$/, "")}
                                      </SyntaxHighlighter>
                                    ) : (
                                      <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
                                        {children}
                                      </code>
                                    );
                                  },
                                  p: ({ children }) => (
                                    <p className="mb-2 last:mb-0">{children}</p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="list-disc pl-5 mb-2">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="list-decimal pl-5 mb-2">
                                      {children}
                                    </ol>
                                  ),
                                  h1: ({ children }) => (
                                    <h1 className="text-xl font-bold mb-2">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-lg font-bold mb-2">
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-base font-bold mb-2">
                                      {children}
                                    </h3>
                                  ),
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-border pl-4 italic my-2">
                                      {children}
                                    </blockquote>
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="text-foreground">
                              {message.content}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isLoading && (
              <div className="px-4 pb-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-info rounded-sm flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">Alleato AI</div>
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t px-4 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Message Alleato AI..."
                  disabled={isLoading}
                  className="min-h-[44px] max-h-[200px] pr-12 resize-none py-4"
                  rows={1}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  size="icon"
                  className="absolute bottom-2 right-2 h-8 w-8"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Alleato AI can make mistakes. Check important info.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
