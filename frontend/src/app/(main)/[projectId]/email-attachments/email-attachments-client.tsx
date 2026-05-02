"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, FileText, ImageIcon, Mail, Paperclip } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type TableColumn,
} from "@/components/tables/unified";
import { apiFetch } from "@/lib/api-client";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

const PdfDocument = dynamic(
  async () => {
    const mod = await import("react-pdf");
    mod.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return mod.Document;
  },
  { ssr: false },
);

const PdfPage = dynamic(
  async () => {
    const mod = await import("react-pdf");
    mod.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return mod.Page;
  },
  { ssr: false },
);

interface EmailAttachment {
  id: number;
  emailId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  contentType: string | null;
  createdAt: string | null;
  textLength: number;
  graphAttachmentId: string | null;
  checksumSha256: string | null;
  project: {
    id: number;
    name: string | null;
    projectNumber: string | null;
  } | null;
  email: {
    id: number;
    subject: string;
    fromName: string | null;
    fromEmail: string | null;
    receivedAt: string | null;
    sentAt: string | null;
    createdAt: string | null;
  } | null;
}

interface EmailAttachmentsClientProps {
  projectId?: number;
  scope?: "project" | "global";
  title?: string;
  tabs?: {
    label: string;
    href: string;
    count?: number;
    isActive?: boolean;
    testId?: string;
    countTestId?: string;
  }[];
}

const attachmentColumns = [
  { id: "fileName", label: "File", defaultVisible: true, alwaysVisible: true },
  { id: "preview", label: "Preview", defaultVisible: true },
  { id: "email", label: "Email", defaultVisible: true },
  { id: "sender", label: "Sender", defaultVisible: true },
  { id: "received", label: "Received", defaultVisible: true },
  { id: "size", label: "Size", defaultVisible: true },
  { id: "text", label: "Text", defaultVisible: true },
];

const globalAttachmentColumns = [
  ...attachmentColumns.slice(0, 3),
  { id: "project", label: "Project", defaultVisible: true },
  ...attachmentColumns.slice(3),
];

function formatBytes(value: number | null): string {
  if (!value) return "Unknown";

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function receivedAt(attachment: EmailAttachment): string | null {
  return (
    attachment.email?.receivedAt ||
    attachment.email?.sentAt ||
    attachment.createdAt ||
    null
  );
}

function senderLabel(attachment: EmailAttachment): string {
  const senderName = attachment.email?.fromName?.trim();
  const senderEmail = attachment.email?.fromEmail?.trim();

  if (senderName && senderEmail) return `${senderName} <${senderEmail}>`;
  if (senderName) return senderName;
  if (senderEmail) return senderEmail;
  return "Unknown sender";
}

function attachmentUrl(projectId: number | undefined, attachmentId: number): string {
  if (projectId) {
    return `/api/projects/${projectId}/email-attachments/${attachmentId}/download`;
  }
  return `/api/email-attachments/${attachmentId}/download`;
}

function previewUrl(projectId: number | undefined, attachmentId: number): string {
  return `${attachmentUrl(projectId, attachmentId)}?disposition=inline`;
}

function isPreviewableAttachment(attachment: EmailAttachment): boolean {
  const contentType = attachment.contentType?.toLowerCase() ?? "";
  return contentType.startsWith("image/") || contentType.includes("pdf");
}

function previewIcon(attachment: EmailAttachment): React.ReactElement {
  const contentType = attachment.contentType?.toLowerCase() ?? "";
  if (contentType.startsWith("image/")) {
    return <ImageIcon className="size-4 text-muted-foreground" />;
  }
  return <FileText className="size-4 text-muted-foreground" />;
}

function isImageAttachment(attachment: EmailAttachment): boolean {
  return (attachment.contentType?.toLowerCase() ?? "").startsWith("image/");
}

function isPdfAttachment(attachment: EmailAttachment): boolean {
  return (attachment.contentType?.toLowerCase() ?? "").includes("pdf");
}

function AttachmentPreviewThumbnail({
  attachment,
  projectId,
}: {
  attachment: EmailAttachment;
  projectId?: number;
}) {
  const src = previewUrl(projectId, attachment.id);

  if (isImageAttachment(attachment)) {
    return (
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }

  if (isPdfAttachment(attachment)) {
    return (
      <PdfDocument
        file={src}
        loading={
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="size-4 text-muted-foreground" />
          </div>
        }
        error={
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="size-4 text-muted-foreground" />
          </div>
        }
      >
        <PdfPage
          pageNumber={1}
          width={96}
          renderAnnotationLayer={false}
          renderTextLayer={false}
        />
      </PdfDocument>
    );
  }

  return previewIcon(attachment);
}

function AttachmentPreviewViewer({
  attachment,
  projectId,
}: {
  attachment: EmailAttachment;
  projectId?: number;
}) {
  const [numPages, setNumPages] = React.useState(1);
  const src = previewUrl(projectId, attachment.id);

  if (isImageAttachment(attachment)) {
    return (
      <div className="flex h-full items-center justify-center overflow-auto bg-muted/30 p-6">
        <img
          src={src}
          alt={attachment.fileName}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  if (isPdfAttachment(attachment)) {
    return (
      <div className="h-full overflow-auto bg-muted/30 p-6">
        <PdfDocument
          file={src}
          onLoadSuccess={({ numPages: nextNumPages }) =>
            setNumPages(nextNumPages)
          }
          loading={
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading preview...
            </div>
          }
          error={
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Preview failed to load.
            </div>
          }
          className="mx-auto flex w-fit flex-col gap-4"
        >
          {Array.from({ length: numPages }, (_, index) => (
            <PdfPage
              key={index + 1}
              pageNumber={index + 1}
              width={900}
              renderAnnotationLayer
              renderTextLayer
              className="overflow-hidden rounded-md bg-background shadow-sm"
            />
          ))}
        </PdfDocument>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      No preview is available for this attachment type.
    </div>
  );
}

function projectLabel(attachment: EmailAttachment): string {
  const projectNumber = attachment.project?.projectNumber?.trim();
  const projectName = attachment.project?.name?.trim();
  const projectId = attachment.project?.id;

  if (projectNumber && projectName) return `${projectNumber} - ${projectName}`;
  if (projectName) return projectName;
  if (projectNumber) return projectNumber;
  return projectId ? `Project ${projectId}` : "Unknown project";
}

export function EmailAttachmentsClient({
  projectId,
  scope = "project",
  title = "Email Attachments",
  tabs,
}: EmailAttachmentsClientProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isGlobal = scope === "global" || !projectId;
  const columnsConfig = isGlobal ? globalAttachmentColumns : attachmentColumns;
  const [previewAttachment, setPreviewAttachment] =
    React.useState<EmailAttachment | null>(null);

  const tableState = useUnifiedTableState({
    entityKey: isGlobal ? "email-attachments-global" : "email-attachments",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "received",
      sortDirection: "desc",
      visibleColumns: columnsConfig.map((column) => column.id),
      filters: {},
    },
  });

  const {
    data: attachments = [],
    isLoading,
    error,
  } = useQuery<EmailAttachment[]>({
    queryKey: [isGlobal ? "email-attachments-global" : "email-attachments", projectId],
    queryFn: ({ signal }) =>
      apiFetch<EmailAttachment[]>(
        isGlobal
          ? "/api/email-attachments"
          : `/api/projects/${projectId}/email-attachments`,
        { signal },
      ),
    enabled: isGlobal || Number.isInteger(projectId),
  });

  React.useEffect(() => {
    if (tableState.visibleColumns.length === 0) {
      tableState.setVisibleColumns(
        columnsConfig.map((column) => column.id),
      );
    }
  }, [columnsConfig, tableState.visibleColumns.length, tableState.setVisibleColumns]);

  const columns = React.useMemo<TableColumn<EmailAttachment>[]>(() => {
    const baseColumns: TableColumn<EmailAttachment>[] = [
      {
        id: "fileName",
        label: "File",
        sortable: true,
        alwaysVisible: true,
        sortValue: (item) => item.fileName,
        render: (item) => (
          <div className="flex min-w-0 items-center gap-2">
            <Paperclip className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">
                {item.fileName}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {item.contentType || "Unknown type"}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "preview",
        label: "Preview",
        render: (item) => {
          if (!isPreviewableAttachment(item)) {
            return (
              <span className="text-sm text-muted-foreground">
                No preview
              </span>
            );
          }

          return (
            <Button
              variant="outline"
              size="sm"
              data-row-interactive="true"
              onClick={() => setPreviewAttachment(item)}
              className="h-16 w-24 overflow-hidden bg-background p-0"
              aria-label={`Preview ${item.fileName}`}
            >
              <AttachmentPreviewThumbnail attachment={item} projectId={projectId} />
            </Button>
          );
        },
      },
      {
        id: "email",
        label: "Email",
        sortable: true,
        sortValue: (item) => item.email?.subject ?? "",
        render: (item) => item.email?.subject || "No subject",
      },
      ...(isGlobal
        ? [
            {
              id: "project",
              label: "Project",
              sortable: true,
              sortValue: projectLabel,
              render: (item: EmailAttachment) =>
                item.project?.id ? (
                  <Link
                    href={`/${item.project.id}/emails`}
                    className="font-medium text-foreground hover:underline"
                    data-row-interactive="true"
                  >
                    {projectLabel(item)}
                  </Link>
                ) : (
                  projectLabel(item)
                ),
            } satisfies TableColumn<EmailAttachment>,
          ]
        : []),
      {
        id: "sender",
        label: "Sender",
        sortable: true,
        sortValue: senderLabel,
        render: senderLabel,
      },
      {
        id: "received",
        label: "Received",
        sortable: true,
        sortValue: (item) => receivedAt(item) ?? "",
        render: (item) => formatDate(receivedAt(item)),
      },
      {
        id: "size",
        label: "Size",
        sortable: true,
        sortValue: (item) => item.fileSize ?? 0,
        render: (item) => formatBytes(item.fileSize),
      },
      {
        id: "text",
        label: "Text",
        sortable: true,
        sortValue: (item) => item.textLength,
        render: (item) =>
          item.textLength > 0
            ? `${item.textLength.toLocaleString()} chars`
            : "No text",
      },
    ];

    return baseColumns;
  }, [isGlobal, projectId]);

  const searchTerm = tableState.debouncedSearch.trim().toLowerCase();
  const filteredAttachments = React.useMemo(() => {
    if (!searchTerm) return attachments;

    return attachments.filter((attachment) =>
      [
        attachment.fileName,
        attachment.contentType ?? "",
        attachment.email?.subject ?? "",
        projectLabel(attachment),
        senderLabel(attachment),
      ].some((value) => value.toLowerCase().includes(searchTerm)),
    );
  }, [attachments, searchTerm]);

  const sortedAttachments = React.useMemo(() => {
    if (!tableState.sortBy) return filteredAttachments;

    const column = columns.find((item) => item.id === tableState.sortBy);
    const getSortValue = column?.sortValue;
    if (!getSortValue) return filteredAttachments;

    return [...filteredAttachments].sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);

      if (typeof valueA === "number" && typeof valueB === "number") {
        return tableState.sortDirection === "asc"
          ? valueA - valueB
          : valueB - valueA;
      }

      const comparison = String(valueA ?? "").localeCompare(
        String(valueB ?? ""),
      );
      return tableState.sortDirection === "asc" ? comparison : -comparison;
    });
  }, [
    columns,
    filteredAttachments,
    tableState.sortBy,
    tableState.sortDirection,
  ]);

  const totalItems = filteredAttachments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / tableState.perPage));
  const pageStart = (tableState.page - 1) * tableState.perPage;
  const pageEnd = pageStart + tableState.perPage;
  const pagedAttachments = sortedAttachments.slice(pageStart, pageEnd);
  const isFiltered = Boolean(tableState.searchInput);

  React.useEffect(() => {
    if (tableState.page > totalPages) {
      tableState.setPage(1);
      tableState.setSearchParams({ page: "1" });
    }
  }, [tableState, totalPages]);

  const handleExport = () => {
    if (filteredAttachments.length === 0) {
      toast.info("No attachments to export");
      return;
    }

    const rows = filteredAttachments.map((attachment) => {
      const baseValues = [
        attachment.fileName,
        attachment.email?.subject ?? "",
        senderLabel(attachment),
        formatDate(receivedAt(attachment)),
        formatBytes(attachment.fileSize),
        attachment.textLength,
      ];

      return (isGlobal
        ? [
            attachment.fileName,
            attachment.email?.subject ?? "",
            projectLabel(attachment),
            senderLabel(attachment),
            formatDate(receivedAt(attachment)),
            formatBytes(attachment.fileSize),
            attachment.textLength,
          ]
        : baseValues
      )
        .map((value) => JSON.stringify(value))
        .join(",");
    });
    const csv = [
      isGlobal
        ? "File,Email,Project,Sender,Received,Size,Text Length"
        : "File,Email,Sender,Received,Size,Text Length",
      ...rows,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `email-attachments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <UnifiedTablePage
        header={{
          title,
          actions: tabs ? undefined : (
            <Button variant="outline" size="sm" asChild>
              <Link href={projectId ? `/${projectId}/emails` : "/emails"}>
                <Mail />
                Emails
              </Link>
            </Button>
          ),
        }}
        tabs={tabs}
        toolbar={{
          totalItems,
          filteredItems: totalItems,
          selectedCount: 0,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search attachments...",
          currentView: "table",
          onViewChange: () => undefined,
          enabledViews: ["table"],
          activeFilters: {},
          onFilterChange: () => undefined,
          onClearFilters: () => undefined,
          columns: columnsConfig,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          onExport: handleExport,
        }}
        data={{
          items: pagedAttachments,
          isLoading,
          error: error instanceof Error ? error : null,
        }}
        table={{
          columns,
          getRowId: (item) => String(item.id),
          rowActions: (item) => (
            <Button variant="ghost" size="icon-sm" asChild>
              <a
                href={attachmentUrl(isGlobal ? undefined : projectId, item.id)}
                aria-label={`Download ${item.fileName}`}
              >
                <Download />
              </a>
            </Button>
          ),
        }}
        sorting={{
          sortBy: tableState.sortBy,
          sortDirection: tableState.sortDirection,
          onSortChange: (sortBy, direction) => {
            tableState.setSortBy(sortBy);
            tableState.setSortDirection(direction);
            tableState.setSearchParams({
              sort: sortBy,
              sort_dir: direction,
              page: "1",
            });
            tableState.setPage(1);
          },
        }}
        emptyState={{
          title: "No email attachments found",
          description: "No synced Outlook attachments are stored for this project yet.",
          filteredDescription: "Try adjusting your search.",
          isFiltered,
          icon: <Paperclip className="h-10 w-10 text-muted-foreground" />,
        }}
        pagination={{
          page: tableState.page,
          totalPages,
          perPage: tableState.perPage,
          onPageChange: (nextPage) => {
            tableState.setPage(nextPage);
            tableState.setSearchParams({ page: String(nextPage) });
          },
          onPerPageChange: (nextPerPage) => {
            const parsed = Number(nextPerPage);
            if (!Number.isFinite(parsed) || parsed <= 0) return;
            tableState.setPerPage(parsed);
            tableState.setSearchParams({
              per_page: String(parsed),
              page: "1",
            });
            tableState.setPage(1);
          },
        }}
        features={{
          enableViews: false,
          enableFilters: false,
          enableBulkDelete: false,
          enableRowSelection: false,
          enableRowReorder: false,
          enableInlineEditing: false,
        }}
      />

      <Modal
        open={Boolean(previewAttachment)}
        onOpenChange={(open) => {
          if (!open) setPreviewAttachment(null);
        }}
      >
        <ModalContent
          size="5xl"
          className="max-h-screen overflow-hidden p-0"
          style={{ height: "85vh" }}
        >
          <ModalHeader className="border-b border-border px-6 pb-4 pt-6">
            <ModalTitle className="truncate pr-8">
              {previewAttachment?.fileName ?? "Attachment preview"}
            </ModalTitle>
            <ModalDescription>
              {previewAttachment?.contentType || "Attachment preview"}
            </ModalDescription>
          </ModalHeader>
          {previewAttachment ? (
            <div
              className="min-h-0"
              style={{ height: "calc(85vh - 96px)" }}
            >
              <AttachmentPreviewViewer
                attachment={previewAttachment}
                projectId={isGlobal ? undefined : projectId}
              />
            </div>
          ) : null}
        </ModalContent>
      </Modal>
    </>
  );
}
