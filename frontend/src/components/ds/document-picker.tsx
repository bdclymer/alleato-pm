'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Link2, Loader2, Plus } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from '@/components/ui/unified-modal';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

interface TaxonomyType {
  type_key: string;
  display_name: string;
  category: string;
}

interface AttachedDocument {
  document_metadata_id: string;
  document_type: string | null;
  attached_at: string;
  title?: string;
}

export interface DocumentPickerProps {
  entityType: DocumentPickerEntityType;
  entityId: string;
  /** Label shown on the trigger button. Defaults to "Link Document". */
  triggerLabel?: string;
  /** Called after a document is successfully attached. */
  onAttached?: (documentMetadataId: string) => void;
}

// ─── Linked documents list ────────────────────────────────────────────────────

interface LinkedDocumentsListProps {
  entityType: DocumentPickerEntityType;
  entityId: string;
}

export function LinkedDocumentsList({ entityType, entityId }: LinkedDocumentsListProps) {
  const { data: docs = [], isLoading } = useQuery<AttachedDocument[]>({
    queryKey: ['linked-docs', entityType, entityId],
    queryFn: () =>
      apiFetch<AttachedDocument[]>(
        `/api/document-picker/linked?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`
      ),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-sm">Loading linked documents…</span>
      </div>
    );
  }

  if (!docs.length) {
    return null;
  }

  return (
    <ul className="space-y-1 mt-2">
      {docs.map((doc) => (
        <li
          key={doc.document_metadata_id}
          className="flex items-center gap-2 text-sm text-foreground"
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{doc.title ?? doc.document_metadata_id}</span>
          {doc.document_type && (
            <span className="text-xs text-muted-foreground shrink-0">({doc.document_type})</span>
          )}
        </li>
      ))}
    </ul>
  );
}

// ─── DocumentPicker (dialog trigger) ─────────────────────────────────────────

export function DocumentPicker({
  entityType,
  entityId,
  triggerLabel = 'Link Document',
  onAttached,
}: DocumentPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const queryClient = useQueryClient();

  // Fetch taxonomy filtered to this entity type
  const { data: types = [], isLoading: typesLoading } = useQuery<TaxonomyType[]>({
    queryKey: ['doc-picker-types', entityType],
    queryFn: () =>
      apiFetch<TaxonomyType[]>(`/api/document-picker/types?for=${entityType}`),
    enabled: open,
  });

  // Group taxonomy by category for the select
  const grouped = types.reduce<Record<string, TaxonomyType[]>>((acc, t) => {
    acc[t.category] = acc[t.category] ?? [];
    acc[t.category].push(t);
    return acc;
  }, {});

  const attachMutation = useMutation({
    mutationFn: (vars: { documentMetadataId: string; documentType: string }) =>
      apiFetch('/api/document-picker/attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          documentMetadataId: vars.documentMetadataId,
          documentType: vars.documentType || null,
        }),
      }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['linked-docs', entityType, entityId] });
      onAttached?.(vars.documentMetadataId);
      setOpen(false);
      setSelectedDocumentId('');
      setSelectedDocumentType('');
    },
  });

  const handleAttach = () => {
    if (!selectedDocumentId) return;
    attachMutation.mutate({
      documentMetadataId: selectedDocumentId,
      documentType: selectedDocumentType,
    });
  };

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Link2 className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </ModalTrigger>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle>Link a Document</ModalTitle>
        </ModalHeader>

        <div className="space-y-4 pt-2">
          {/* Document metadata ID input — in a full implementation this would be
              a searchable combobox over document_metadata. For now: text input
              with paste-in ID, consistent with Phase 5 scope. */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Document ID
            </label>
            <Input
              value={selectedDocumentId}
              onChange={(e) => setSelectedDocumentId(e.target.value)}
              placeholder="Paste document_metadata ID…"
            />
          </div>

          {/* Document type select */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Document Type
            </label>
            {typesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading types…
              </div>
            ) : types.length === 0 ? (
              <p className="text-sm text-muted-foreground">No types defined for this entity.</p>
            ) : (
              <Select
                value={selectedDocumentType}
                onValueChange={setSelectedDocumentType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(grouped).map(([category, items]) => (
                    <SelectGroup key={category}>
                      <SelectLabel className="capitalize">{category}</SelectLabel>
                      {items.map((t) => (
                        <SelectItem key={t.type_key} value={t.type_key}>
                          {t.display_name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={attachMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAttach}
              disabled={!selectedDocumentId || attachMutation.isPending}
              className="gap-1.5"
            >
              {attachMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Link
            </Button>
          </div>

          {attachMutation.isError && (
            <p className="text-sm text-destructive">
              Failed to link document. Please try again.
            </p>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
