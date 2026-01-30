"use client";

import * as React from "react";
import { UploadCloud, Download, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupabase } from "@/hooks/useSupabase";
import type { Database } from "@/types/database.types";
import { toast } from "@/hooks/use-toast";
import type {
  DirectoryImportResult,
  DirectoryTemplateType,
} from "@/services/directoryAdminService";

type Tables = Database["public"]["Tables"];
type Company = Tables["companies"]["Row"];
type PermissionTemplate = Tables["permission_templates"]["Row"];

interface ImportDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const IMPORT_TYPES: { value: DirectoryTemplateType; label: string }[] = [
  { value: "users", label: "Users" },
  { value: "contacts", label: "Contacts" },
  { value: "companies", label: "Companies" },
];

export function ImportDialog({
  projectId,
  open,
  onOpenChange,
  onComplete,
}: ImportDialogProps) {
  const supabase = useSupabase();
  const [file, setFile] = React.useState<File | null>(null);
  const [importType, setImportType] =
    React.useState<DirectoryTemplateType>("users");
  const [hasHeaders, setHasHeaders] = React.useState(true);
  const [skipDuplicates, setSkipDuplicates] = React.useState(true);
  const [updateExisting, setUpdateExisting] = React.useState(false);
  const [defaultCompanyId, setDefaultCompanyId] = React.useState<string>("");
  const [defaultTemplateId, setDefaultTemplateId] = React.useState<string>("");
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [templates, setTemplates] = React.useState<PermissionTemplate[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<DirectoryImportResult | null>(null);

  React.useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      const [{ data: companyData }, { data: templateData }] = await Promise.all([
        supabase.from("companies").select("*").order("name"),
        supabase
          .from("permission_templates")
          .select("*")
          .eq("scope", "project")
          .order("name"),
      ]);

      if (companyData) setCompanies(companyData);
      if (templateData) setTemplates(templateData);
    };

    void loadData();
  }, [open, supabase]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a CSV file to import.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", importType);
      formData.append("hasHeaders", String(hasHeaders));
      formData.append("skipDuplicates", String(skipDuplicates));
      formData.append("updateExisting", String(updateExisting));
      if (defaultCompanyId) {
        formData.append("defaultCompanyId", defaultCompanyId);
      }
      if (defaultTemplateId) {
        formData.append("defaultPermissionTemplateId", defaultTemplateId);
      }

      const response = await fetch(
        `/api/projects/${projectId}/directory/import`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to import CSV");
      }

      const payload = await response.json();
      setResult(payload.data);
      toast.success("Import complete");
      setFile(null);
      if (onComplete) onComplete();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to import directory data",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateDownload = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/directory/templates/${importType}`,
      );
      if (!response.ok) {
        throw new Error("Unable to download template");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `directory-${importType}-template.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to download template",
      );
    }
  };

  const showPermissionOptions = importType === "users";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Directory Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Import type</Label>
            <RadioGroup
              value={importType}
              onValueChange={(value) =>
                setImportType(value as DirectoryTemplateType)
              }
              className="flex gap-4"
            >
              {IMPORT_TYPES.map((item) => (
                <div
                  key={item.value}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <RadioGroupItem value={item.value} id={item.value} />
                  <Label htmlFor={item.value}>{item.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Upload CSV file</Label>
            <label className="flex flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 px-6 py-10 text-center cursor-pointer hover:bg-muted/60">
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <span className="mt-2 text-sm text-muted-foreground">
                Drag CSV file here or click to browse
              </span>
              <Input
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={handleFileChange}
              />
              {file && (
                <div className="mt-4 text-sm font-medium">{file.name}</div>
              )}
            </label>
          </div>

          {showPermissionOptions && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Default company</Label>
                <Select
                  value={defaultCompanyId}
                  onValueChange={(value) => setDefaultCompanyId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default permission template</Label>
                <Select
                  value={defaultTemplateId}
                  onValueChange={setDefaultTemplateId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox
                checked={hasHeaders}
                onCheckedChange={(checked) =>
                  setHasHeaders(Boolean(checked))
                }
              />
              <span className="text-sm">File includes header row</span>
            </label>
            <label className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox
                checked={skipDuplicates}
                onCheckedChange={(checked) =>
                  setSkipDuplicates(Boolean(checked))
                }
              />
              <span className="text-sm">Skip duplicate emails</span>
            </label>
            <label className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox
                checked={updateExisting}
                onCheckedChange={(checked) =>
                  setUpdateExisting(Boolean(checked))
                }
              />
              <span className="text-sm">Update existing records</span>
            </label>
          </div>

          {result && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="font-medium">Import Summary</div>
              <ul className="mt-2 space-y-1">
                <li>
                  Imported: <strong>{result.imported}</strong>
                </li>
                <li>
                  Updated: <strong>{result.updated}</strong>
                </li>
                <li>
                  Skipped: <strong>{result.skipped}</strong>
                </li>
              </ul>
              {result.errors.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground max-h-32 overflow-auto">
                  {result.errors.slice(0, 5).map((error) => (
                    <div key={`${error.row}-${error.field ?? "row"}`}>
                      Row {error.row}: {error.message}
                    </div>
                  ))}
                  {result.errors.length > 5 && (
                    <div className="mt-1">
                      +{result.errors.length - 5} more errors
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              type="button"
              onClick={handleTemplateDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
