"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api-client";
import {
  KNOWLEDGE_CATEGORIES,
  knowledgeKeys,
} from "@/hooks/use-company-knowledge";
import { useQueryClient } from "@tanstack/react-query";

interface KnowledgeUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KnowledgeUploadDialog({
  open,
  onOpenChange,
}: KnowledgeUploadDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("general");
  const [visibility, setVisibility] = React.useState("internal");
  const [approvalStatus, setApprovalStatus] = React.useState("draft");
  const [aiSearchable, setAiSearchable] = React.useState(true);
  const [tags, setTags] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file before uploading");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("category", category);
    formData.append("visibility", visibility);
    formData.append("approval_status", approvalStatus);
    formData.append("ai_searchable", String(aiSearchable));
    formData.append("tags", tags);

    setIsUploading(true);
    try {
      await apiFetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });
      await queryClient.invalidateQueries({ queryKey: knowledgeKeys.all });
      toast.success("Knowledge source uploaded");
      setTitle("");
      setTags("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Knowledge Source</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="knowledge-file">File</Label>
            <Input
              ref={fileInputRef}
              id="knowledge-file"
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md,.markdown"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="knowledge-title">Title</Label>
            <Input
              id="knowledge-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Defaults to the file name"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KNOWLEDGE_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Approval</Label>
              <Select value={approvalStatus} onValueChange={setApprovalStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="admin_only">Admin only</SelectItem>
                  <SelectItem value="client_visible">Client visible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border border-border/50 px-3 py-2">
              <div>
                <Label>Available to Ask Alleato</Label>
                <p className="text-xs text-muted-foreground">
                  Keep off for drafts or unreviewed source files.
                </p>
              </div>
              <Switch checked={aiSearchable} onCheckedChange={setAiSearchable} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="knowledge-tags">Tags</Label>
            <Input
              id="knowledge-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="Comma-separated tags"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              <Upload />
              {isUploading ? "Uploading..." : "Upload Source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
