"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  PageContainer,
  ProjectPageHeader,
} from "@/components/layout";
import {
  SelectField,
  TextField,
  TextareaField,
} from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Plus,
  Save,
  Search,
  BookOpen,
  Trash2,
  Pencil,
  FileText,
  Upload,
  FileIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import {
  useCompanyContext,
  useUpdateCompanyContext,
  useKnowledgeArticles,
  useCreateKnowledgeArticle,
  useUpdateKnowledgeArticle,
  useDeleteKnowledgeArticle,
  type KnowledgeCategory,
  type KnowledgeArticle,
} from "@/hooks/use-company-knowledge";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KNOWLEDGE_CATEGORIES: { value: KnowledgeCategory; label: string }[] = [
  { value: "strategy", label: "Strategy" },
  { value: "policy", label: "Policy" },
  { value: "process", label: "Process" },
  { value: "market_intel", label: "Market Intel" },
  { value: "lessons_learned", label: "Lessons Learned" },
  { value: "best_practice", label: "Best Practice" },
  { value: "org_update", label: "Org Update" },
  { value: "general", label: "General" },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CompanyKnowledgePage() {
  return (
    <>
      <ProjectPageHeader
        title="Company Knowledge Base"
        description="Manage company profile and knowledge articles for the AI assistant"
      />
      <PageContainer>
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              Company Profile
            </TabsTrigger>
            <TabsTrigger value="articles" className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              Knowledge Articles
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <CompanyProfileTab />
          </TabsContent>

          <TabsContent value="articles">
            <KnowledgeArticlesTab />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Company Profile Tab
// ---------------------------------------------------------------------------

function CompanyProfileTab() {
  const { data: ctx, isLoading } = useCompanyContext();
  const updateCtx = useUpdateCompanyContext();

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [initialized, setInitialized] = useState(false);

  // Initialize form from fetched data
  if (ctx && !initialized) {
    setForm({
      mission: ctx.mission ?? "",
      vision: ctx.vision ?? "",
      company_history: ctx.company_history ?? "",
      core_values: Array.isArray(ctx.core_values)
        ? (ctx.core_values as string[]).join(", ")
        : "",
      key_differentiators: Array.isArray(ctx.key_differentiators)
        ? (ctx.key_differentiators as string[]).join(", ")
        : "",
      target_markets: Array.isArray(ctx.target_markets)
        ? (ctx.target_markets as string[]).join(", ")
        : "",
      service_areas: Array.isArray(ctx.service_areas)
        ? (ctx.service_areas as string[]).join(", ")
        : "",
      certifications: Array.isArray(ctx.certifications)
        ? (ctx.certifications as string[]).join(", ")
        : "",
      annual_revenue_range: ctx.annual_revenue_range ?? "",
      employee_count: ctx.employee_count ?? "",
      founded_year: ctx.founded_year ?? "",
      headquarters: ctx.headquarters ?? "",
      notes: ctx.notes ?? "",
    });
    setInitialized(true);
  }

  const handleSave = () => {
    // Convert comma-separated strings to arrays for JSON fields
    const toArray = (val: unknown) => {
      if (typeof val !== "string" || val.trim() === "") return [];
      return val.split(",").map((s: string) => s.trim()).filter(Boolean);
    };

    updateCtx.mutate(
      {
        mission: form.mission as string || null,
        vision: form.vision as string || null,
        company_history: form.company_history as string || null,
        core_values: toArray(form.core_values),
        key_differentiators: toArray(form.key_differentiators),
        target_markets: toArray(form.target_markets),
        service_areas: toArray(form.service_areas),
        certifications: toArray(form.certifications),
        annual_revenue_range: form.annual_revenue_range as string || null,
        employee_count: form.employee_count ? Number(form.employee_count) : null,
        founded_year: form.founded_year ? Number(form.founded_year) : null,
        headquarters: form.headquarters as string || null,
        notes: form.notes as string || null,
      } as Record<string, unknown>,
      {
        onSuccess: () => toast.success("Company profile saved"),
        onError: () => toast.error("Failed to save company profile"),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Loading company profile...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Company Profile</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            This information helps the AI understand your company&apos;s identity and strategy.
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={updateCtx.isPending}>
          <Save />
          {updateCtx.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <Separator />

      <div className="grid gap-4">
        <TextareaField
          label="Mission Statement"
          value={(form.mission as string) ?? ""}
          onChange={(e) => setForm({ ...form, mission: e.target.value })}
          rows={3}
          placeholder="Our mission is to..."
        />
        <TextareaField
          label="Vision"
          value={(form.vision as string) ?? ""}
          onChange={(e) => setForm({ ...form, vision: e.target.value })}
          rows={3}
          placeholder="Our vision is to become..."
        />
        <TextareaField
          label="Company History"
          value={(form.company_history as string) ?? ""}
          onChange={(e) => setForm({ ...form, company_history: e.target.value })}
          rows={3}
          placeholder="Founded in... key milestones..."
        />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Founded Year"
            value={String(form.founded_year ?? "")}
            onChange={(e) => setForm({ ...form, founded_year: e.target.value })}
            placeholder="2015"
          />
          <TextField
            label="Headquarters"
            value={(form.headquarters as string) ?? ""}
            onChange={(e) => setForm({ ...form, headquarters: e.target.value })}
            placeholder="City, State"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Employee Count"
            value={String(form.employee_count ?? "")}
            onChange={(e) => setForm({ ...form, employee_count: e.target.value })}
            placeholder="50"
          />
          <TextField
            label="Annual Revenue Range"
            value={(form.annual_revenue_range as string) ?? ""}
            onChange={(e) =>
              setForm({ ...form, annual_revenue_range: e.target.value })
            }
            placeholder="$10M - $25M"
          />
        </div>

        <Separator />

        <TextField
          label="Core Values (comma-separated)"
          value={(form.core_values as string) ?? ""}
          onChange={(e) => setForm({ ...form, core_values: e.target.value })}
          placeholder="Integrity, Excellence, Safety, Innovation"
        />
        <TextField
          label="Key Differentiators (comma-separated)"
          value={(form.key_differentiators as string) ?? ""}
          onChange={(e) =>
            setForm({ ...form, key_differentiators: e.target.value })
          }
          placeholder="In-house engineering, Data-driven approach, 98% on-time delivery"
        />
        <TextField
          label="Target Markets (comma-separated)"
          value={(form.target_markets as string) ?? ""}
          onChange={(e) => setForm({ ...form, target_markets: e.target.value })}
          placeholder="Commercial, Healthcare, Industrial"
        />
        <TextField
          label="Service Areas (comma-separated)"
          value={(form.service_areas as string) ?? ""}
          onChange={(e) => setForm({ ...form, service_areas: e.target.value })}
          placeholder="General Contracting, Design-Build, Construction Management"
        />
        <TextField
          label="Certifications (comma-separated)"
          value={(form.certifications as string) ?? ""}
          onChange={(e) => setForm({ ...form, certifications: e.target.value })}
          placeholder="LEED AP, OSHA 30, PMP, DBIA"
        />
        <TextareaField
          label="Notes"
          value={(form.notes as string) ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          placeholder="Any other context the AI should know about the company..."
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Knowledge Articles Tab
// ---------------------------------------------------------------------------

function KnowledgeArticlesTab() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(
    null,
  );

  const { data: articles, isLoading } = useKnowledgeArticles({
    category: categoryFilter,
    search: searchFilter || undefined,
  });

  const createArticle = useCreateKnowledgeArticle();
  const updateArticle = useUpdateKnowledgeArticle();
  const deleteArticle = useDeleteKnowledgeArticle();

  const handleDelete = (id: string) => {
    deleteArticle.mutate(id, {
      onSuccess: () => toast.success("Article archived"),
      onError: () => toast.error("Failed to archive article"),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Knowledge Articles
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Free-form knowledge the AI can reference when answering questions.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => {
                setEditingArticle(null);
                setDialogOpen(true);
              }}
            >
              <Plus />
              Add Article
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {editingArticle ? "Edit Article" : "New Knowledge Article"}
              </DialogTitle>
            </DialogHeader>
            <ArticleForm
              article={editingArticle}
              onSubmit={(data) => {
                if (editingArticle) {
                  updateArticle.mutate(
                    { id: editingArticle.id, ...data },
                    {
                      onSuccess: () => {
                        toast.success("Article updated");
                        setDialogOpen(false);
                      },
                      onError: () => toast.error("Failed to update article"),
                    },
                  );
                } else {
                  createArticle.mutate(data, {
                    onSuccess: () => {
                      toast.success("Article created");
                      setDialogOpen(false);
                    },
                    onError: () => toast.error("Failed to create article"),
                  });
                }
              }}
              isPending={createArticle.isPending || updateArticle.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            className="pl-8 h-9 text-sm"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {KNOWLEDGE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          Loading articles...
        </div>
      ) : !articles?.length ? (
        <div className="text-sm text-muted-foreground py-12 text-center">
          No knowledge articles yet. Add your first one to start building your
          AI&apos;s understanding of your company.
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => (
            <div
              key={article.id}
              className="group flex items-start gap-3 rounded-md bg-muted/40 p-3 hover:bg-muted/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {article.title}
                  </span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {article.category.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {article.content}
                </p>
                {article.tags && article.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {article.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] h-4"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setEditingArticle(article);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleDelete(article.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Article Form
// ---------------------------------------------------------------------------

function ArticleForm({
  article,
  onSubmit,
  isPending,
}: {
  article: KnowledgeArticle | null;
  onSubmit: (data: {
    title: string;
    content: string;
    category: KnowledgeCategory;
    tags?: string[];
    source?: string;
  }) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [category, setCategory] = useState<KnowledgeCategory>(
    article?.category ?? "general",
  );
  const [tags, setTags] = useState(article?.tags?.join(", ") ?? "");
  const [source, setSource] = useState(article?.source ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: tags
        ? tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
      source: source.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g., Q4 2025 Strategic Priorities"
        required
      />
      <SelectField
        label="Category"
        value={category}
        onValueChange={(v) => setCategory(v as KnowledgeCategory)}
        options={KNOWLEDGE_CATEGORIES.map((c) => ({
          value: c.value,
          label: c.label,
        }))}
      />
      <TextareaField
        label="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={8}
        placeholder="Enter the knowledge content here. The AI will use this to answer questions about your company."
        required
      />
      <TextField
        label="Tags (comma-separated, optional)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="hiring, growth, Q4"
      />
      <TextField
        label="Source (optional)"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="e.g., Board Meeting 2026-01-15, Strategy Deck"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving..." : article ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Documents Tab
// ---------------------------------------------------------------------------

type UploadedDocument = {
  id: string;
  title: string;
  file_name: string | null;
  category: string | null;
  source: string | null;
  status: string | null;
  created_at: string | null;
};

function DocumentsTab() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [uploads, setUploads] = useState<
    {
      id: string;
      file: File;
      status: "uploading" | "success" | "error";
      message?: string;
    }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing documents
  const fetchDocuments = useCallback(async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("document_metadata")
        .select("id, title, file_name, category, source, status, created_at")
        .eq("source", "upload")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setDocuments(data as UploadedDocument[]);
      }
    } catch {
      // Silently handle error
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  // Load documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length) return;

    for (const file of Array.from(selectedFiles)) {
      const uploadId = crypto.randomUUID();
      setUploads((prev) => [
        { id: uploadId, file, status: "uploading" as const },
        ...prev,
      ]);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "document");

        const resp = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        const result = await resp.json();

        if (!resp.ok) {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId
                ? { ...u, status: "error", message: result.error }
                : u,
            ),
          );
        } else {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId
                ? {
                    ...u,
                    status: "success",
                    message: "Uploaded — pipeline processing queued",
                  }
                : u,
            ),
          );
          // Refresh documents list
          fetchDocuments();
        }
      } catch {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, status: "error", message: "Network error" }
              : u,
          ),
        );
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "uploaded":
        return "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400";
      case "processing":
        return "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400";
      case "ready":
        return "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400";
      case "error":
        return "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Document Uploads
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload PDFs, Word docs, or text files. They&apos;ll be parsed,
            embedded, and made available to the AI assistant.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.doc,.txt,.md,.markdown"
            multiple
            onChange={handleFileSelect}
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center gap-3 rounded-md bg-muted/40 p-3"
            >
              {upload.status === "uploading" && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {upload.status === "success" && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
              {upload.status === "error" && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-foreground truncate block">
                  {upload.file.name}
                </span>
                {upload.message && (
                  <span className="text-xs text-muted-foreground">
                    {upload.message}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {(upload.file.size / 1024).toFixed(0)} KB
              </span>
              {upload.status !== "uploading" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeUpload(upload.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Documents list */}
      {isLoadingDocs ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          Loading documents...
        </div>
      ) : !documents.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            No documents uploaded yet. Upload PDFs, DOCX, or text files to
            build your AI knowledge base.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supported: .pdf, .docx, .doc, .txt, .md
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-start gap-3 rounded-md bg-muted/40 p-3 hover:bg-muted/60 transition-colors"
            >
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {doc.title}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${getStatusColor(doc.status)}`}
                  >
                    {doc.status ?? "unknown"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {doc.file_name && (
                    <span className="text-xs text-muted-foreground truncate">
                      {doc.file_name}
                    </span>
                  )}
                  {doc.created_at && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
