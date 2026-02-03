"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  Database,
  CheckCircle,
  ExternalLink,
  Search,
  Layers,
  AlertCircle,
  Zap,
  BookOpen,
  Code,
  HelpCircle,
  Video,
  FileCode,
  Building2,
  FolderOpen,
  Globe,
  ChevronRight,
} from "lucide-react";
import type { Database as DbTypes } from "@/types/database.types";
import { PageHeader } from "@/components/layout/page-header-unified";
import { cn } from "@/lib/utils";

type CrawledPage = DbTypes["public"]["Tables"]["crawled_pages"]["Row"];

// Category icons and styling
const CATEGORY_STYLES: Record<
  string,
  { icon: any; color: string; bgColor: string }
> = {
  // Tools
  budget: { icon: Database, color: "text-blue-600", bgColor: "bg-blue-50" },
  "change-events": {
    icon: Zap,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  commitments: {
    icon: FileText,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  contracts: {
    icon: FileText,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  "prime-contracts": {
    icon: FileText,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  "change-orders": {
    icon: AlertCircle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  "daily-log": {
    icon: BookOpen,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  "direct-costs": {
    icon: Database,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  directory: { icon: Layers, color: "text-cyan-600", bgColor: "bg-cyan-50" },
  documents: { icon: FileText, color: "text-foreground", bgColor: "bg-muted" },
  drawings: { icon: FileCode, color: "text-pink-600", bgColor: "bg-pink-50" },
  "punch-list": {
    icon: CheckCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  rfis: { icon: HelpCircle, color: "text-amber-600", bgColor: "bg-amber-50" },
  // Resources
  tutorials: {
    icon: BookOpen,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  videos: { icon: Video, color: "text-red-600", bgColor: "bg-red-50" },
  faq: { icon: HelpCircle, color: "text-amber-600", bgColor: "bg-amber-50" },
  "api-docs": { icon: Code, color: "text-slate-600", bgColor: "bg-slate-50" },
  // Default
  default: { icon: Globe, color: "text-foreground", bgColor: "bg-muted" },
};

interface CategoryGroup {
  category: string;
  displayName: string;
  urls: Array<{
    url: string;
    title: string;
    chunks: number;
    embeddingPercentage: number;
    createdAt: string;
  }>;
  totalPages: number;
  totalChunks: number;
  avgEmbedding: number;
}

function extractPageTitle(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    if (pathParts.length === 0) return "Home";

    // Special handling for Procore URLs
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart.includes("?")) {
      return lastPart
        .split("?")[0]
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    return lastPart
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  } catch {
    return url.split("/").pop() || "Unknown Page";
  }
}

function formatCategoryName(category: string): string {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES["default"];
}

export default function CrawledPagesPage() {
  const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCrawledPages = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("crawled_pages")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCrawledPages(data || []);
      } catch (error) {

        console.error("Failed to load crawled pages:", error);

        toast.error("Failed to load crawled pages", { description: "Please try again." });

      } finally {
        setLoading(false);
      }
    };

    fetchCrawledPages();
  }, []);

  const { categoryGroups, stats } = useMemo((): {
    categoryGroups: CategoryGroup[];
    stats: {
      totalPages: number;
      totalChunks: number;
      totalEmbeddings: number;
      embeddingCoverage: number;
      categoryCount: number;
    };
  } => {
    // Filter out pages with 'procore pay' category
    const filteredPages = crawledPages.filter(
      (page) => page.category?.toLowerCase() !== "procore pay",
    );

    // Group pages by category
    const categoryMap = new Map<string, CategoryGroup>();

    filteredPages.forEach((page) => {
      const category = page.category || "uncategorized";

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          displayName: formatCategoryName(category),
          urls: [],
          totalPages: 0,
          totalChunks: 0,
          avgEmbedding: 0,
        });
      }
    });

    // Group pages by URL within each category
    const urlGroups = new Map<string, CrawledPage[]>();

    filteredPages.forEach((page) => {
      const key = `${page.category}::${page.url}`;
      if (!urlGroups.has(key)) {
        urlGroups.set(key, []);
      }
      urlGroups.get(key)!.push(page);
    });

    // Process each URL group into the appropriate category
    urlGroups.forEach((pages, key) => {
      const [category, url] = key.split("::");
      const categoryGroup = categoryMap.get(category || "uncategorized");

      if (!categoryGroup) return;

      const totalChunks = pages.length;
      const chunksWithEmbeddings = pages.filter(
        (p) => p.embedding !== null,
      ).length;
      const embeddingPercentage =
        totalChunks > 0
          ? Math.round((chunksWithEmbeddings / totalChunks) * 100)
          : 0;
      const createdAt = pages[0]?.created_at || "";

      const urlData = {
        url,
        title: extractPageTitle(url),
        chunks: totalChunks,
        embeddingPercentage,
        createdAt,
      };

      categoryGroup.urls.push(urlData);
      categoryGroup.totalPages++;
      categoryGroup.totalChunks += totalChunks;
    });

    // Calculate average embeddings for each category
    categoryMap.forEach((group) => {
      const totalEmbeddings = group.urls.reduce(
        (sum, url) => sum + (url.chunks * url.embeddingPercentage) / 100,
        0,
      );
      group.avgEmbedding =
        group.totalChunks > 0
          ? Math.round((totalEmbeddings / group.totalChunks) * 100)
          : 0;
    });

    // Calculate overall stats
    // Count unique URLs (excluding category prefix)
    const uniqueUrls = new Set(filteredPages.map((p) => p.url));
    const totalPages = uniqueUrls.size;
    const totalChunks = filteredPages.length;
    const totalEmbeddings = filteredPages.filter(
      (p) => p.embedding !== null,
    ).length;
    const embeddingCoverage =
      totalChunks > 0 ? Math.round((totalEmbeddings / totalChunks) * 100) : 0;

    // Sort categories alphabetically
    const sortedCategories = Array.from(categoryMap.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    );

    return {
      categoryGroups: sortedCategories,
      stats: {
        totalPages,
        totalChunks,
        totalEmbeddings,
        embeddingCoverage,
        categoryCount: categoryMap.size,
      },
    };
  }, [crawledPages]);

  const filteredCategoryGroups = useMemo(() => {
    if (!searchQuery) return categoryGroups;

    const query = searchQuery.toLowerCase();
    return categoryGroups
      .map((group: CategoryGroup) => ({
        ...group,
        urls: group.urls.filter(
          (url: (typeof group.urls)[0]) =>
            url.title.toLowerCase().includes(query) ||
            url.url.toLowerCase().includes(query),
        ),
      }))
      .filter(
        (group: CategoryGroup) =>
          group.urls.length > 0 ||
          group.displayName.toLowerCase().includes(query),
      );
  }, [categoryGroups, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Procore Documentation Knowledge Base"
          description="Explore crawled Procore support documentation organized by tools and resource types"
        />

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPages}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Chunks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalChunks.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Embeddings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.embeddingCoverage}%
              </div>
              <Progress value={stats.embeddingCoverage} className="h-1 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.categoryCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Excluded</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                Procore Pay
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Vectorized</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalEmbeddings.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Accordion Content */}
        <div className="space-y-6">
          <Accordion type="single" collapsible className="w-full">
            {filteredCategoryGroups.map((categoryGroup) => {
              const categoryStyle = getCategoryStyle(categoryGroup.category);
              const Icon = categoryStyle.icon;

              return (
                <AccordionItem
                  key={categoryGroup.category}
                  value={categoryGroup.category}
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            categoryStyle.bgColor,
                          )}
                        >
                          <Icon
                            className={cn("h-5 w-5", categoryStyle.color)}
                          />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-lg">
                            {categoryGroup.displayName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {categoryGroup.totalPages} pages •{" "}
                            {categoryGroup.totalChunks} chunks
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {categoryGroup.avgEmbedding}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Coverage
                          </p>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1 pt-4">
                      {categoryGroup.urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors group"
                        >
                          <span className="text-sm text-foreground group-hover:text-primary truncate mr-4">
                            {url.title}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className="text-xs">
                              {url.chunks} chunks
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                url.embeddingPercentage === 100 &&
                                  "text-success",
                                url.embeddingPercentage < 100 &&
                                  "text-warning",
                              )}
                            >
                              {url.embeddingPercentage}%
                            </Badge>
                            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
