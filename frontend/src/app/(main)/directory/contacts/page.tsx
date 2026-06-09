"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/format";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/hooks/use-confirm";
import { getDirectoryTabs } from "@/config/directory-tabs";
import { ContactFormSheet } from "@/components/domain/contacts/ContactFormSheet";
import {
  UnifiedTablePage,
  CellBadge,
  CellEmail,
  CellLink,
  CellText,
  TableDateValue,
  type CellColorMap,
} from "@/components/tables/unified";
import type { ColumnConfig, TableColumn } from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useServerTableDefinition } from "@/features/tables/server-table";
import {
  contactColumns,
  contactsTableDefinition,
  EMPTY_CONTACT_FILTERS,
  type ContactFilterState,
  type ContactTableRow,
} from "@/features/contacts/directory-contacts-table-definition";

type InlineEditDraft = Pick<ContactTableRow, "first_name" | "last_name" | "email" | "type" | "phone">;

const CONTACT_TYPE_COLORS: CellColorMap = {
  user: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  employee: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  contact: "bg-muted text-muted-foreground",
};

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

function buildContactTableColumns(
  editingContactId: string | null,
  inlineDraft: InlineEditDraft,
  onInlineDraftChange: (field: keyof InlineEditDraft, value: string) => void,
): TableColumn<ContactTableRow>[] {
  return [
    {
      ...contactColumns[0],
      render: (item) =>
        editingContactId === item.id ? (
          <div className="flex gap-2">
            <Input
              value={inlineDraft.first_name}
              onChange={(event) => onInlineDraftChange("first_name", event.target.value)}
              placeholder="First name"
              className="h-8 min-w-32"
            />
            <Input
              value={inlineDraft.last_name}
              onChange={(event) => onInlineDraftChange("last_name", event.target.value)}
              placeholder="Last name"
              className="h-8 min-w-32"
            />
          </div>
        ) : (
          <CellLink
            value={item.full_name}
            href={`/directory/contacts/${item.id}`}
            className="font-medium"
          />
        ),
      sortValue: (item) => item.full_name,
      csvValue: (item) => item.full_name,
    },
    {
      ...contactColumns[1],
      render: (item) =>
        editingContactId === item.id ? (
          <Input
            type="email"
            value={inlineDraft.email}
            onChange={(event) => onInlineDraftChange("email", event.target.value)}
            placeholder="email@example.com"
            className="h-8"
          />
        ) : (
          <span>{item.email || "-"}</span>
        ),
      sortValue: (item) => item.email || "",
      csvValue: (item) => item.email || "",
    },
    {
      ...contactColumns[2],
      render: (item) =>
        editingContactId === item.id ? (
          <Input
            value={inlineDraft.type}
            onChange={(event) => onInlineDraftChange("type", event.target.value)}
            placeholder="Type"
            className="h-8"
          />
        ) : (
          <CellBadge value={item.type} colorMap={CONTACT_TYPE_COLORS} emptyLabel="-" />
        ),
      sortValue: (item) => item.type || "",
      csvValue: (item) => item.type || "",
    },
    {
      ...contactColumns[3],
      render: (item) => (
        <CellLink
          value={item.company}
          href={item.company_id ? `/directory/companies?companyId=${item.company_id}` : null}
          emptyLabel="-"
        />
      ),
      sortValue: (item) => item.company || "",
      csvValue: (item) => item.company || "",
    },
    {
      ...contactColumns[4],
      render: (item) =>
        editingContactId === item.id ? (
          <Input
            value={inlineDraft.phone}
            onChange={(event) => onInlineDraftChange("phone", event.target.value)}
            placeholder="Phone"
            className="h-8"
          />
        ) : (
          <span>{item.phone || "-"}</span>
        ),
      sortValue: (item) => item.phone || "",
      csvValue: (item) => item.phone || "",
    },
    {
      ...contactColumns[5],
      render: (item) =>
        item.is_admin ? (
          <Badge variant="default">Admin</Badge>
        ) : null,
      sortValue: (item) => (item.is_admin ? 1 : 0),
      csvValue: (item) => (item.is_admin ? "Admin" : "Standard"),
    },
    {
      ...contactColumns[6],
      render: (item) => <span>{formatDate(item.created_at)}</span>,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
      csvValue: (item) => formatDate(item.created_at),
    },
  ];
}

function ContactPreviewPane({
  contact,
  contacts,
  onSelectContact,
  onClose,
}: {
  contact: ContactTableRow | null;
  contacts: ContactTableRow[];
  onSelectContact: (id: string) => void;
  onClose: () => void;
}): ReactElement {
  const router = useRouter();
  const currentIndex = contact ? contacts.findIndex((c) => c.id === contact.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < contacts.length - 1;

  if (!contact) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        <p>Select a contact to preview details.</p>
      </div>
    );
  }

  const typeLabel = contact.type
    ? contact.type.charAt(0).toUpperCase() + contact.type.slice(1).toLowerCase()
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header with navigation */}
      <div className="flex items-center justify-between gap-1 px-4 h-11">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            disabled={!hasPrev}
            onClick={() => hasPrev && onSelectContact(contacts[currentIndex - 1].id)}
            aria-label="Previous contact"
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            disabled={!hasNext}
            onClick={() => hasNext && onSelectContact(contacts[currentIndex + 1].id)}
            aria-label="Next contact"
          >
            <ChevronRight />
          </Button>
          <span className="text-xs text-muted-foreground ml-1">
            {currentIndex + 1} of {contacts.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Contact header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              {/* eslint-disable-next-line design-system/no-raw-heading */}
              <h3 className="text-sm font-semibold leading-tight truncate">{contact.full_name}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {typeLabel && (
                  <CellBadge value={contact.type} colorMap={CONTACT_TYPE_COLORS} />
                )}
                {contact.is_admin && (
                  <Badge variant="default" className="text-xs">Admin</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Company */}
        {contact.company && (
          <div className="px-5 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Company
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {contact.company_id ? (
                <a
                  href={`/directory/companies?companyId=${contact.company_id}`}
                  className="text-primary hover:underline truncate"
                >
                  {contact.company}
                </a>
              ) : (
                <span className="truncate">{contact.company}</span>
              )}
            </div>
          </div>
        )}

        {/* Contact info */}
        {(contact.email || contact.phone) && (
          <div className="px-5 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Contact
            </p>
            <div className="space-y-2">
              {contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <CellEmail value={contact.email} />
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <CellText value={contact.phone} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Details */}
        {contact.created_at && (
          <div className="px-5 pb-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Details
            </p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Added</dt>
                <dd><TableDateValue value={contact.created_at} /></dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="shrink-0 px-5 pb-5">
        <Button
          className="w-full"
          variant="outline"
          onClick={() => router.push(`/directory/contacts/${contact.id}`)}
        >
          View Contact
        </Button>
      </div>
    </div>
  );
}

export default function DirectoryContactsPage(): ReactElement {
  const pathname = usePathname()! ?? "";
  const router = useRouter();
  const searchParams = (useSearchParams() ?? new URLSearchParams()) as NonNullable<ReturnType<typeof useSearchParams>>;
  const { confirm, ConfirmDialog } = useConfirm();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingContactId, setEditingContactId] = React.useState<string | null>(null);
  const [inlineDraft, setInlineDraft] = React.useState<InlineEditDraft>({
    first_name: "",
    last_name: "",
    email: "",
    type: "",
    phone: "",
  });

  const {
    tableState,
    items: tableData,
    totalItems,
    totalPages,
    isLoading,
    isFetching,
    error,
    activeFilters,
    isFiltered,
    refresh,
    handleViewChange,
    handleFilterChange,
    handleSortChange,
    handlePageChange,
    handlePerPageChange,
  } = useServerTableDefinition<ContactTableRow, ContactFilterState>({
    definition: contactsTableDefinition,
    searchParams,
    pathname,
    router,
  });

  const uniqueTypes = React.useMemo(
    () => Array.from(new Set(tableData.map((contact) => contact.type).filter(Boolean))),
    [tableData],
  );

  const selectedContactId = searchParams.get("detail");
  const selectedContact =
    selectedContactId ? tableData.find((c) => c.id === selectedContactId) ?? null : null;
  const activeContactId = selectedContact?.id ?? null;

  const tabs = getDirectoryTabs(pathname);
  const onInlineDraftChange = React.useCallback((field: keyof InlineEditDraft, value: string) => {
    setInlineDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const tableColumns = React.useMemo(
    () => buildContactTableColumns(editingContactId, inlineDraft, onInlineDraftChange),
    [editingContactId, inlineDraft, onInlineDraftChange],
  );

  const handleStartInlineEdit = (contact: ContactTableRow) => {
    setEditingContactId(contact.id);
    setInlineDraft({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      type: contact.type,
      phone: contact.phone,
    });
  };

  const handleCancelInlineEdit = () => {
    setEditingContactId(null);
    setInlineDraft({
      first_name: "",
      last_name: "",
      email: "",
      type: "",
      phone: "",
    });
  };

  const handleSaveInlineEdit = async () => {
    if (!editingContactId) {
      return;
    }
    const firstName = inlineDraft.first_name.trim();
    const lastName = inlineDraft.last_name.trim();
    const personType = inlineDraft.type.trim();
    if (!firstName || !lastName || !personType) {
      toast.error("First name, last name, and type are required.");
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("people")
      .update({
        first_name: firstName,
        last_name: lastName,
        email: inlineDraft.email.trim() || null,
        person_type: personType,
        phone_business: inlineDraft.phone.trim() || null,
        phone_mobile: inlineDraft.phone.trim() || null,
      })
      .eq("id", editingContactId);

    if (updateError) {
      toast.error(updateError.message || "Failed to update contact.");
      return;
    }

    toast.success("Contact updated.");
    handleCancelInlineEdit();
    await refresh();
  };

  const deleteContacts = React.useCallback(async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return true;

    const supabase = createClient();

    const { error: unlinkError } = await supabase
      .from("users_auth")
      .delete()
      .in("person_id", ids);
    if (unlinkError) {
      toast.error(unlinkError.message || "Failed to remove user links.");
      return false;
    }

    const { error: deleteError } = await supabase.from("people").delete().in("id", ids);
    if (deleteError) {
      toast.error(deleteError.message || "Failed to delete contact.");
      return false;
    }

    return true;
  }, []);

  const handleDeleteContact = async (contact: ContactTableRow) => {
    const confirmed = await confirm({
      description: `Delete ${contact.full_name}? This cannot be undone.`,
      variant: "destructive",
      confirmLabel: "Delete",
    });
    if (!confirmed) return;

    const deleted = await deleteContacts([contact.id]);
    if (!deleted) return;
    toast.success("Contact deleted.");
    if (editingContactId === contact.id) {
      handleCancelInlineEdit();
    }
    tableState.setSelectedIds((prev) => prev.filter((id) => id !== contact.id));
    await refresh();
  };

  const handleBulkDelete = async () => {
    const selectedIds = tableState.selectedIds;
    if (selectedIds.length === 0) return;

    const confirmed = await confirm({
      description: `Delete ${selectedIds.length} selected contact(s)? This cannot be undone.`,
      variant: "destructive",
      confirmLabel: "Delete",
    });
    if (!confirmed) return;

    const deleted = await deleteContacts(selectedIds);
    if (!deleted) return;
    toast.success(`${selectedIds.length} contact(s) deleted.`);
    if (editingContactId && selectedIds.includes(editingContactId)) {
      handleCancelInlineEdit();
    }
    tableState.setSelectedIds([]);
    await refresh();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds(tableData.map((contact) => contact.id));
      return;
    }
    tableState.setSelectedIds([]);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds((prev) => [...new Set([...prev, id])]);
      return;
    }
    tableState.setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
  };

  const handleExport = () => {
    const rowsToExport = tableData;
    if (rowsToExport.length === 0) {
      toast.info("No contacts to export.");
      return;
    }

    const visibleColumns = tableColumns.filter((column) =>
      tableState.visibleColumns.includes(column.id),
    );

    const headers = visibleColumns.map((column) => escapeCsvValue(column.label));
    const rows = rowsToExport.map((item) =>
      visibleColumns
        .map((column) => {
          const value = column.csvValue ? column.csvValue(item) : String(column.sortValue?.(item) ?? "");
          return escapeCsvValue(value);
        })
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "directory-contacts.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderRowActions = (contact: ContactTableRow) => {
    if (editingContactId === contact.id) {
      return (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveInlineEdit}>
            <Check />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelInlineEdit}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleStartInlineEdit(contact)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Contact
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => void handleDeleteContact(contact)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Contact
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Contacts",
          description:
            "Manage companies, clients, contacts, users, and employees across your organization",
          actions: (
            <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus />
              New Contact
            </Button>
          ),
        }}
        tabs={tabs}
        toolbar={{
          totalItems,
          filteredItems: tableData.length,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: contactsTableDefinition.searchPlaceholder,
          currentView: tableState.currentView,
          onViewChange: handleViewChange,
          enabledViews: contactsTableDefinition.allowedViews,
          filters: [
            {
              id: "type",
              label: "Type",
              type: "select",
              options: uniqueTypes.map((type) => ({ value: type, label: type })),
            },
            {
              id: "is_admin",
              label: "Admin Access",
              type: "select",
              options: [
                { value: "true", label: "Admin" },
                { value: "false", label: "Standard" },
              ],
            },
          ],
          activeFilters,
          onFilterChange: (filters) => handleFilterChange(filters as ContactFilterState),
          onClearFilters: () => handleFilterChange(EMPTY_CONTACT_FILTERS),
          columns: contactColumns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          savedViewsScope: contactsTableDefinition.entityKey,
          savedViewsDefaults: {
            visibleColumns: contactsTableDefinition.defaultVisibleColumns,
            columnOrder: contactColumns.map((column) => column.id),
            columnWidths: {},
            sortBy: contactsTableDefinition.defaultSortBy,
            sortDirection: contactsTableDefinition.defaultSortDirection,
            filters: contactsTableDefinition.defaultFilters,
          },
          onExport: handleExport,
          onBulkDelete: handleBulkDelete,
        }}
        data={{
          items: tableData,
          isLoading,
          isFetching,
          error: error ?? undefined,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id,
          activeRowId: activeContactId,
          onRowClick: (item) => tableState.setSearchParams({ detail: item.id }),
          rowActions: renderRowActions,
        }}
        sidePanel={{
          content: (
            <ContactPreviewPane
              contact={selectedContact}
              contacts={tableData}
              onSelectContact={(id) => tableState.setSearchParams({ detail: id })}
              onClose={() => tableState.setSearchParams({ detail: null })}
            />
          ),
        }}
        sorting={{
          sortBy: tableState.sortBy,
          sortDirection: tableState.sortDirection,
          onSortChange: handleSortChange,
        }}
        selection={{
          selectedIds: tableState.selectedIds,
          onSelectAll: handleSelectAll,
          onSelectRow: handleSelectRow,
        }}
        emptyState={{
          title: "No contacts found",
          description: "No contacts are available yet.",
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered,
          action: (
            <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus />
              Add Contact
            </Button>
          ),
        }}
        pagination={{
          page: tableState.page,
          totalPages,
          perPage: tableState.perPage,
          clientSide: false,
          onPageChange: handlePageChange,
          onPerPageChange: handlePerPageChange,
        }}
        features={{
          enableExport: true,
          enableBulkDelete: true,
          enableRowSelection: true,
          enableRowActions: true,
        }}
        layout={{
          fullBleedTable: true,
          removeTableFrame: true,
        }}
      />

      <ContactFormSheet
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          void refresh();
        }}
      />
      {ConfirmDialog}
    </>
  );
}
