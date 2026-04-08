"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Calculator,
  Check,
  ChevronsUpDown,
  ClipboardList,
  DollarSign,
  FileText,
  FolderKanban,
  HardHat,
  Layers,
  LineChart,
  Package,
  PenTool,
  Receipt,
  Search,
  SendHorizontal,
  Settings,
  Shield,
  Sparkles,
  Users,
  Workflow,
  X,
  ChevronRight,
} from "lucide-react";

import { MessageResponse } from "@/components/ai-elements/message";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Article {
  id: number;
  title: string;
  url: string;
  slug: string;
  category: string | null;
  subcategory: string | null;
  word_count: number | null;
}

// ---------------------------------------------------------------------------
// Category icons
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  // Hero card categories
  Budget: <DollarSign className="h-4 w-4" />,
  Budgeting: <DollarSign className="h-4 w-4" />,
  "Prime Contracts": <FileText className="h-4 w-4" />,
  Commitments: <ClipboardList className="h-4 w-4" />,
  "Change Events": <Layers className="h-4 w-4" />,
  "Change Orders": <FolderKanban className="h-4 w-4" />,
  Invoicing: <BarChart3 className="h-4 w-4" />,
  // Remaining DB categories
  "Admin Company": <Settings className="h-4 w-4" />,
  "Admin Project": <Shield className="h-4 w-4" />,
  Bidding: <Briefcase className="h-4 w-4" />,
  "Company Directory": <Users className="h-4 w-4" />,
  "Direct Costs": <Receipt className="h-4 w-4" />,
  Drawings: <PenTool className="h-4 w-4" />,
  "ERP Integration": <Workflow className="h-4 w-4" />,
  Equipment: <Package className="h-4 w-4" />,
  Estimating: <Calculator className="h-4 w-4" />,
  Forecasting: <LineChart className="h-4 w-4" />,
  General: <BookOpen className="h-4 w-4" />,
  Schedule: <ClipboardList className="h-4 w-4" />,
  Safety: <HardHat className="h-4 w-4" />,
};

function getCategoryIcon(category: string): React.ReactNode {
  return CATEGORY_ICONS[category] ?? <BookOpen className="h-4 w-4" />;
}

// Hero cards
const HERO_CARDS = [
  {
    title: "Budget",
    description: "Set up budgets, track costs, and manage financial health.",
    icon: <DollarSign className="h-5 w-5" />,
    category: "Budget",
  },
  {
    title: "Prime Contracts",
    description: "Create and manage owner contracts, revisions, and billing.",
    icon: <FileText className="h-5 w-5" />,
    category: "Prime Contracts",
  },
  {
    title: "Commitments",
    description: "Create and manage subcontracts, purchase orders, and more.",
    icon: <ClipboardList className="h-5 w-5" />,
    category: "Commitments",
  },
  {
    title: "Change Events",
    description:
      "Track potential changes, assess cost impact, and link to change orders.",
    icon: <Layers className="h-5 w-5" />,
    category: "Change Events",
  },
  {
    title: "Change Orders",
    description:
      "Handle contract changes, approvals, and cost impact tracking.",
    icon: <FolderKanban className="h-5 w-5" />,
    category: "Change Orders",
  },
  {
    title: "Invoicing",
    description: "Manage payment applications, billing periods, and approvals.",
    icon: <BarChart3 className="h-5 w-5" />,
    category: "Invoicing",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMessageText(
  parts: Array<{ type: string; text?: string }>
): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProcoreDocsPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState("");
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/procore-docs/chat" }),
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const searchTerm = search.trim();
  const isSearching = searchTerm.length > 0;
  const showHero = !selectedCategory && !isSearching;

  const messageCount = messages.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- scroll on new messages intentionally
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount]);

  // Load categories
  useEffect(() => {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("support_articles")
      .select("category")
      .not("category", "is", null)
      .then(
        ({ data }: { data: { category: string | null }[] | null }) => {
          if (!data) return;
          const unique = [...new Set(data.map((r) => r.category as string))]
            .filter(Boolean)
            .sort();
          setCategories(unique);
        }
      );
  }, []);

  // Load articles
  useEffect(() => {
    if (!selectedCategory && !search.trim()) {
      setArticles([]);
      setIsLoadingArticles(false);
      return;
    }

    let ignore = false;
    const supabase = createClient();
    setIsLoadingArticles(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const base = (supabase as any)
      .from("support_articles")
      .select("id, title, url, slug, category, subcategory, word_count")
      .order("title")
      .limit(100);

    if (search.trim()) {
      void base
        .ilike("title", `%${search.trim()}%`)
        .then(({ data }: { data: Article[] | null }) => {
          if (ignore) return;
          setArticles((data ?? []) as Article[]);
          setIsLoadingArticles(false);
        });
    } else if (selectedCategory) {
      void base
        .eq("category", selectedCategory)
        .then(({ data }: { data: Article[] | null }) => {
          if (ignore) return;
          setArticles((data ?? []) as Article[]);
          setIsLoadingArticles(false);
        });
    }

    return () => {
      ignore = true;
    };
  }, [selectedCategory, search]);

  const handleSendMessage = useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed || isStreaming) return;
    setChatInput("");
    sendMessage({ text: trimmed });
  }, [chatInput, isStreaming, sendMessage]);

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectCategory = (cat: string | null) => {
    setSelectedCategory(cat);
    setSearch("");
    setComboOpen(false);
  };

  const groupedArticles = useMemo(() => {
    const groups: Record<string, Article[]> = {};
    for (const article of articles) {
      const key = article.subcategory || "General";
      if (!groups[key]) groups[key] = [];
      groups[key].push(article);
    }
    return groups;
  }, [articles]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <PageShell
      variant="content"
      title="Procore Documentation"
      description="Guides and reference for using Procore to manage projects, track costs, and collaborate with your construction teams."
      actions={
        <Button onClick={() => setChatOpen(true)} className="h-9 gap-2">
          <Sparkles />
          Ask AI
        </Button>
      }
    >
      <div>

        {/* ─── Action bar: Search + Category combobox ─── */}
        <div className="mb-8 flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Search documentation..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value) setSelectedCategory(null);
              }}
              className="h-9 border-border/50 bg-card pl-9 text-sm shadow-none placeholder:text-muted-foreground/50"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground h-6 w-6 p-0"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Category combobox */}
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboOpen}
                className="h-9 w-48 justify-between border-border/50 bg-card text-sm font-normal shadow-none"
              >
                <span
                  className={cn(
                    "truncate",
                    !selectedCategory && "text-muted-foreground/70"
                  )}
                >
                  {selectedCategory ?? "All categories"}
                </span>
                <ChevronsUpDown className="shrink-0 text-muted-foreground/50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0" align="start">
              <Command>
                <CommandInput placeholder="Filter categories..." />
                <CommandList>
                  <CommandEmpty>No categories found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all-categories"
                      onSelect={() => selectCategory(null)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5",
                          !selectedCategory ? "opacity-100" : "opacity-0"
                        )}
                      />
                      All categories
                    </CommandItem>
                    {categories.map((cat) => (
                      <CommandItem
                        key={cat}
                        value={cat}
                        onSelect={() => selectCategory(cat)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5",
                            selectedCategory === cat
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <span className="mr-2 text-muted-foreground/70">
                          {getCategoryIcon(cat)}
                        </span>
                        {cat}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

        </div>

        {/* ─── Content area ─── */}
        {showHero ? (
          <>
            {/* Category quick-link cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {HERO_CARDS.map((card) => (
                <Button
                  key={card.title}
                  type="button"
                  variant="ghost"
                  onClick={() => selectCategory(card.category)}
                  className="group relative h-auto rounded-lg border border-border/50 bg-background p-5 text-left transition-all hover:border-border hover:bg-muted flex flex-col items-start whitespace-normal"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      {card.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {card.title}
                    </h3>
                  </div>
                  <p className="w-full text-xs text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                  <ChevronRight className="absolute right-4 top-5 h-4 w-4 text-muted-foreground/30 transition-all group-hover:text-muted-foreground group-hover:translate-x-0.5" />
                </Button>
              ))}
            </div>

            {/* Tools — remaining categories */}
            {categories.length > HERO_CARDS.length && (
              <div className="mt-12">
                <h2 className="text-lg font-semibold text-foreground mb-6">
                  Tools
                </h2>
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                  {categories
                    .filter(
                      (cat) =>
                        !HERO_CARDS.some((card) => card.category === cat)
                    )
                    .map((cat) => (
                      <Button
                        key={cat}
                        type="button"
                        variant="ghost"
                        onClick={() => selectCategory(cat)}
                        className="group flex h-auto items-start gap-3 text-left justify-start"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                          {getCategoryIcon(cat)}
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                            {cat}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                            Browse {cat.toLowerCase()} documentation and guides.
                          </p>
                        </div>
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* ─── Article list ─── */
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedCategory && !isSearching && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {getCategoryIcon(selectedCategory)}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-foreground tracking-tight">
                    {isSearching
                      ? `Results for "${searchTerm}"`
                      : (selectedCategory ?? "Documentation")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {articles.length}{" "}
                    {articles.length === 1 ? "article" : "articles"}
                  </p>
                </div>
              </div>
              {(selectedCategory || isSearching) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearch("");
                  }}
                  className="text-xs text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>

            {isLoadingArticles ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-muted/30"
                  />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  No articles found
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSearching
                    ? "Try a broader phrase or browse by category."
                    : "Select a category to explore the documentation."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedArticles).map(
                  ([group, groupArticles]) => (
                    <div key={group}>
                      {Object.keys(groupedArticles).length > 1 && (
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                          {group}
                        </p>
                      )}
                      <div className="space-y-px overflow-hidden rounded-lg bg-card">
                        {groupArticles.map((article) => (
                          <Link
                            key={article.id}
                            href={`/procore-docs/${article.slug ?? article.id}`}
                            className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary" />
                              <div className="min-w-0">
                                <p className="truncate text-sm text-foreground transition-colors group-hover:text-primary">
                                  {article.title}
                                </p>
                                {article.subcategory &&
                                  Object.keys(groupedArticles).length <= 1 && (
                                    <p className="truncate text-[11px] text-muted-foreground/50">
                                      {article.subcategory}
                                    </p>
                                  )}
                              </div>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── AI Chat Sheet ─── */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent
          side="right"
          className="flex min-h-0 w-full max-w-xl flex-col p-0 sm:max-w-2xl"
        >
          <SheetHeader className="border-b px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold">
                  Documentation Assistant
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Ask about Procore workflows and features
                </p>
              </div>
            </div>
          </SheetHeader>

          {/* Messages */}
          <ScrollArea className="min-h-0 flex-1 px-5 py-4">
            <div className="space-y-4 pb-4">
              {messages.length === 0 && (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    How can I help?
                  </p>
                  <p className="mx-auto mb-6 max-w-xs text-xs text-muted-foreground leading-relaxed">
                    Ask me anything about Procore features, workflows, or best
                    practices.
                  </p>
                  <div className="flex flex-col gap-2">
                    {[
                      "How do I create a budget?",
                      "What are change orders?",
                      "How do commitments work?",
                    ].map((example) => (
                      <Button
                        key={example}
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setChatInput(example);
                          chatInputRef.current?.focus();
                        }}
                        className="rounded-md border-border/50 bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground h-auto justify-start"
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-4 py-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50"
                    )}
                  >
                    {message.role === "user" ? (
                      <p className="text-sm leading-relaxed">
                        {getMessageText(message.parts)}
                      </p>
                    ) : (
                      <MessageResponse className="text-sm leading-relaxed text-foreground">
                        {getMessageText(message.parts)}
                      </MessageResponse>
                    )}
                  </div>
                </div>
              ))}

              {error && (
                <p className="text-xs text-destructive">
                  Something went wrong. Please try again.
                </p>
              )}

              {isStreaming && messages.at(-1)?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="rounded-xl bg-muted/50 px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Chat input */}
          <div className="border-t px-5 py-4">
            <div className="flex items-end gap-2">
              <Textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Ask a question..."
                disabled={isStreaming}
                className="min-h-14 resize-none border-border/50 text-sm shadow-none"
                rows={2}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isStreaming}
                size="icon"
                className="h-9 w-9 shrink-0"
              >
                <SendHorizontal />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
