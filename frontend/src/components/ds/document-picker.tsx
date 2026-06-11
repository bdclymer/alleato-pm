'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Loader2, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentPickerEntityType =
  | 'project'
  | 'subcontract'
  | 'purchase_order'
  | 'commitment'      // resolved to subcontract or purchase_order at API level
  | 'prime_contract'
  | 'change_order'
  | 'invoice'
  | 'submittal'
  | 'rfi'
  | 'drawing'
  | 'company';

interface LinkedDoc {
  document_metadata_id: string;
  document_type: string | null;
  attached_at: string;
  title: string | null;
  file_name: string | null;
  file_path: string | null;
  source_size: number | null;
  download_url: string | null;
}

interface DocumentTypeOption {
  type_key: string;
  display_name: string;
  category: string;
  sort_order: number;
}

export interface DocumentPickerProps {
  entityType: DocumentPickerEntityType;
  entityId: string;
  onAttached?: (documentMetadataId: string) => void;
}

export interface LinkedDocumentsListProps {
  entityType: DocumentPickerEntityType;
  entityId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const ACCEPTED_TYPES = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.dwg', '.dxf', '.zip', '.txt',
].join(',');

const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const NO_DOCUMENT_TYPE = '__none';

// ─── EntityAttachments ────────────────────────────────────────────────────────

export interface EntityAttachmentsProps {
  entityType: DocumentPickerEntityType;
  entityId: string;
  projectId: string | number;
  defaultDocumentType?: string;
  className?: string;
}

export function EntityAttachments({
  entityType,
  entityId,
  projectId,
  defaultDocumentType,
  className,
}: EntityAttachmentsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState(
    defaultDocumentType ?? NO_DOCUMENT_TYPE
  );
  const fileInputId = useRef(`entity-attach-${entityType}-${entityId}`);
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ['entity-attachments', entityType, entityId] as const,
    [entityType, entityId]
  );

  const { data: docs = [], isLoading } = useQuery<LinkedDoc[]>({
    queryKey,
    queryFn: () =>
      apiFetch<LinkedDoc[]>(
        `/api/document-picker/linked?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`
      ),
  });

  const { data: documentTypes = [] } = useQuery<DocumentTypeOption[]>({
    queryKey: ['document-types', entityType],
    queryFn: () =>
      apiFetch<DocumentTypeOption[]>(
        `/api/document-picker/types?for=${encodeURIComponent(entityType)}`
      ),
  });

  const typeLabelByKey = useMemo(
    () =>
      new Map(
        documentTypes.map((option) => [option.type_key, option.display_name])
      ),
    [documentTypes]
  );

  const removeMutation = useMutation({
    mutationFn: (documentMetadataId: string) =>
      apiFetch(
        `/api/document-picker/linked?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}&documentMetadataId=${encodeURIComponent(documentMetadataId)}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Document removed');
    },
    onError: () => toast.error('Failed to remove document'),
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({
      documentMetadataId,
      documentType,
    }: {
      documentMetadataId: string;
      documentType: string | null;
    }) =>
      apiFetch('/api/document-picker/linked', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          documentMetadataId,
          documentType,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Document type updated');
    },
    onError: (error) => {
      toast.error('Failed to update document type', {
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
    },
  });

  const uploadFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`${file.name} exceeds the 50 MB limit`);
        return;
      }
      setUploading((prev) => [...prev, file.name]);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('entityType', entityType);
        fd.append('entityId', entityId);
        fd.append('projectId', String(projectId));
        if (selectedDocumentType !== NO_DOCUMENT_TYPE) {
          fd.append('documentType', selectedDocumentType);
        }
        await apiFetch('/api/document-picker/upload', { method: 'POST', body: fd });
        void queryClient.invalidateQueries({ queryKey });
        toast.success(`${file.name} uploaded`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`, {
          description:
            error instanceof Error ? error.message : 'Please try again.',
        });
      } finally {
        setUploading((prev) => prev.filter((n) => n !== file.name));
      }
    },
    [entityType, entityId, projectId, selectedDocumentType, queryClient, queryKey]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((f) => void uploadFile(f));
    },
    [uploadFile]
  );

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const isUploadingAny = uploading.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {documentTypes.length > 0 && (
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <span className="text-xs text-muted-foreground">Type for new uploads</span>
          <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DOCUMENT_TYPE}>Uncategorized</SelectItem>
              {documentTypes.map((option) => (
                <SelectItem key={option.type_key} value={option.type_key}>
                  {option.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Drop zone — using <label> so clicking opens the file picker without JS */}
      <label
        htmlFor={fileInputId.current}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/40 hover:bg-muted/30',
          isUploadingAny && 'pointer-events-none opacity-60'
        )}
      >
        <Input
          id={fileInputId.current}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploadingAny}
        />
        {isUploadingAny ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Uploading {uploading.join(', ')}…
            </p>
          </>
        ) : (
          <>
            <Upload className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium">
              {isDragging ? 'Drop files here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, Word, Excel, images, DWG — max 50 MB
            </p>
          </>
        )}
      </label>

      {/* Document list */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : docs.length === 0 && !isUploadingAny ? (
        <p className="text-sm text-muted-foreground">No documents attached yet.</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {docs.map((doc) => {
            const name = doc.title ?? doc.file_name ?? doc.document_metadata_id;
            const isRemoving =
              removeMutation.isPending &&
              removeMutation.variables === doc.document_metadata_id;
            return (
              <li
                key={doc.document_metadata_id}
                className={cn(
                  'flex flex-col gap-3 py-2.5 first:pt-0 sm:flex-row sm:items-center',
                  isRemoving && 'opacity-50'
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        doc.source_size ? formatBytes(doc.source_size) : null,
                        doc.document_type
                          ? typeLabelByKey.get(doc.document_type) ?? doc.document_type
                          : null,
                        doc.attached_at ? formatDate(doc.attached_at) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                  {documentTypes.length > 0 && (
                    <Select
                      value={doc.document_type ?? NO_DOCUMENT_TYPE}
                      disabled={
                        updateTypeMutation.isPending &&
                        updateTypeMutation.variables?.documentMetadataId ===
                          doc.document_metadata_id
                      }
                      onValueChange={(value) =>
                        updateTypeMutation.mutate({
                          documentMetadataId: doc.document_metadata_id,
                          documentType:
                            value === NO_DOCUMENT_TYPE ? null : value,
                        })
                      }
                    >
                      <SelectTrigger size="sm" className="h-8 min-w-0 flex-1 sm:w-44 sm:flex-none">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_DOCUMENT_TYPE}>Uncategorized</SelectItem>
                        {documentTypes.map((option) => (
                          <SelectItem key={option.type_key} value={option.type_key}>
                            {option.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {doc.download_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open(doc.download_url ?? '', '_blank')}
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    disabled={isRemoving}
                    onClick={() => removeMutation.mutate(doc.document_metadata_id)}
                    title="Remove"
                  >
                    {isRemoving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── LinkedDocumentsList (backwards compat) ───────────────────────────────────

export function LinkedDocumentsList({ entityType, entityId }: LinkedDocumentsListProps) {
  const queryKey = useMemo(
    () => ['entity-attachments', entityType, entityId] as const,
    [entityType, entityId]
  );

  const { data: docs = [], isLoading } = useQuery<LinkedDoc[]>({
    queryKey,
    queryFn: () =>
      apiFetch<LinkedDoc[]>(
        `/api/document-picker/linked?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`
      ),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading linked documents…
      </div>
    );
  }

  if (!docs.length) return null;

  return (
    <ul className="mt-2 space-y-1">
      {docs.map((doc) => (
        <li key={doc.document_metadata_id} className="flex items-center gap-2 text-sm">
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {doc.title ?? doc.file_name ?? doc.document_metadata_id}
          </span>
          {doc.document_type && (
            <span className="shrink-0 text-xs text-muted-foreground">
              ({doc.document_type})
            </span>
          )}
          {doc.download_url && (
            <a
              href={doc.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto shrink-0 text-xs text-primary hover:underline"
            >
              Download
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

// ─── DocumentPicker (kept for backwards compat) ───────────────────────────────

export function DocumentPicker({ entityType, entityId, onAttached }: DocumentPickerProps) {
  const [open, setOpen] = useState(false);
  const [docId, setDocId] = useState('');
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ['entity-attachments', entityType, entityId] as const,
    [entityType, entityId]
  );

  const attachMutation = useMutation({
    mutationFn: (documentMetadataId: string) =>
      apiFetch('/api/document-picker/attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId, documentMetadataId }),
      }),
    onSuccess: (_data, documentMetadataId) => {
      void queryClient.invalidateQueries({ queryKey });
      onAttached?.(documentMetadataId);
      setOpen(false);
      setDocId('');
      toast.success('Document linked');
    },
    onError: () => toast.error('Failed to link document'),
  });

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <X className="h-3.5 w-3.5 rotate-45" />
        Link existing
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
      <Input
        className="flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none focus-visible:ring-0 placeholder:text-muted-foreground"
        placeholder="Paste document_metadata ID…"
        value={docId}
        onChange={(e) => setDocId(e.target.value)}
      />
      <Button
        size="sm"
        disabled={!docId || attachMutation.isPending}
        onClick={() => attachMutation.mutate(docId)}
      >
        {attachMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          'Link'
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(false);
          setDocId('');
        }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
