"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { z } from "zod";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { PageShell, SectionRuleHeading } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Text } from "@/components/ds/text";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHANGE_REASONS = [
  "Allowance",
  "Backcharge",
  "Client Request",
  "Design Development",
  "Design Error",
  "Design Omission",
  "Existing Condition",
  "Field Condition",
  "Owner Request",
  "Regulatory Requirement",
  "Scope Change",
  "Unforeseen Condition",
  "Value Engineering",
  "Other",
] as const;

// DB constraint allows: draft | pending | approved | rejected
const CCO_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  contract_id: z.string().min(1, "Commitment is required"),
  change_order_number: z.string().min(1, "CO number is required"),
  revision: z.number().int().nullable().optional(),
  title: z.string().trim().min(1, "Title is required").max(255),
  status: z.enum(["draft", "pending", "approved", "rejected"]),
  is_private: z.boolean(),
  change_reason: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  invoiced_date: z.string().optional().nullable(),
  paid_date: z.string().optional().nullable(),
  designated_reviewer: z.string().optional().nullable(),
  request_received_from: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  executed: z.boolean(),
  signed_co_received_date: z.string().optional().nullable(),
  schedule_impact: z.number().int().optional().nullable(),
  location: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  field_change: z.boolean(),
  paid_in_full: z.boolean(),
});

type FormData = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommitmentOption {
  id: string;
  contract_number: string | null;
  title: string | null;
  company_name: string | null;
}

interface ChangeEventSummary {
  id: string;
  number: string | null;
  title: string;
  reason: string | null;
}

interface Contact {
  id: string;
  name: string;
}

// Formats commitment metadata into a single display label for picker rows.
function formatCommitmentLabel(option: CommitmentOption): string {
  const number = option.contract_number?.trim() || "—";
  const title = option.title?.trim() || "Untitled";
  return `${number} — ${title}`;
}

// ---------------------------------------------------------------------------
// Contact combobox component
// ---------------------------------------------------------------------------

function ContactCombobox({
  value,
  onChange,
  contacts,
  search,
  onSearchChange,
  open,
  onOpenChange,
  placeholder = "Select or type a name",
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  contacts: Contact[];
  search: string;
  onSearchChange: (v: string) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  placeholder?: string;
}) {
  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
          )}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search contacts…"
            value={search}
            onValueChange={onSearchChange}
          />
          <CommandList>
            <CommandEmpty>
              {search ? (
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    onChange(search);
                    onOpenChange(false);
                    onSearchChange("");
                  }}
                >
                  Use &ldquo;{search}&rdquo;
                </button>
              ) : (
                "No contacts found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.name}
                  onSelect={() => {
                    onChange(c.name);
                    onOpenChange(false);
                    onSearchChange("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === c.name ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Renders a searchable commitment picker with stable selection behavior.
function CommitmentCombobox({
  value,
  onChange,
  commitments,
  search,
  onSearchChange,
  open,
  onOpenChange,
  isLoading,
}: {
  value: string;
  onChange: (v: string) => void;
  commitments: CommitmentOption[];
  search: string;
  onSearchChange: (v: string) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isLoading: boolean;
}) {
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = commitments.filter((option) => {
    if (!normalizedSearch) return true;
    const label = formatCommitmentLabel(option).toLowerCase();
    const company = option.company_name?.toLowerCase() ?? "";
    return label.includes(normalizedSearch) || company.includes(normalizedSearch);
  });

  const selected = commitments.find((option) => option.id === value);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label="Contract *"
          data-testid="commitment-contract-picker"
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
          disabled={isLoading}
        >
          {selected ? formatCommitmentLabel(selected) : "Select a commitment"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search commitments…"
            value={search}
            onValueChange={onSearchChange}
          />
          <CommandList>
            <CommandEmpty>No commitments found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {
                    onChange(option.id);
                    onOpenChange(false);
                    onSearchChange("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{formatCommitmentLabel(option)}</span>
                    {option.company_name ? (
                      <span className="text-xs text-muted-foreground truncate">
                        {option.company_name}
                      </span>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewCommitmentCOPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;

  const changeEventIdsParam = searchParams.get("changeEventIds");
  const changeEventIds = changeEventIdsParam
    ? changeEventIdsParam.split(",").filter(Boolean)
    : [];
  const hasChangeEvents = changeEventIds.length > 0;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commitments, setCommitments] = useState<CommitmentOption[]>([]);
  const [isLoadingCommitments, setIsLoadingCommitments] = useState(true);
  const [changeEvents, setChangeEvents] = useState<ChangeEventSummary[]>([]);
  const [isLoadingChangeEvents, setIsLoadingChangeEvents] = useState(false);
  const [isLoadingNextNumber, setIsLoadingNextNumber] = useState(false);
  const [commitmentSearch, setCommitmentSearch] = useState("");
  const [commitmentOpen, setCommitmentOpen] = useState(false);

  // Contacts combobox state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const contactsFetched = useRef(false);
  const [reviewerSearch, setReviewerSearch] = useState("");
  const [reviewerOpen, setReviewerOpen] = useState(false);
  const [requestFromSearch, setRequestFromSearch] = useState("");
  const [requestFromOpen, setRequestFromOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      contract_id: "",
      change_order_number: "",
      revision: 0,
      title: "",
      status: "draft",
      is_private: true,
      change_reason: null,
      due_date: null,
      invoiced_date: null,
      paid_date: null,
      designated_reviewer: null,
      request_received_from: null,
      description: null,
      executed: false,
      signed_co_received_date: null,
      schedule_impact: null,
      location: null,
      reference: null,
      field_change: false,
      paid_in_full: false,
    },
  });

  const selectedContractId = form.watch("contract_id");
  const selectedCommitment = commitments.find((c) => c.id === selectedContractId);

  // Default to the only available commitment to avoid a dead-end required-field flow.
  useEffect(() => {
    if (isLoadingCommitments) return;
    if (commitments.length !== 1) return;
    if (selectedContractId) return;
    form.setValue("contract_id", commitments[0].id, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
  }, [commitments, form, isLoadingCommitments, selectedContractId]);

  // ── Fetch commitments with company names ─────────────────────────
  useEffect(() => {
    const fetchCommitments = async () => {
      setIsLoadingCommitments(true);
      try {
        const data = await apiFetch<CommitmentOption[]>(
          `/api/projects/${projectId}/commitment-options`,
        );
        setCommitments(data);
      } catch {
        toast.error("Could not load commitments.");
      } finally {
        setIsLoadingCommitments(false);
      }
    };
    fetchCommitments();
  }, [projectId]);

  // ── Auto-generate next CO number when commitment is selected ──────
  useEffect(() => {
    if (!selectedContractId) return;
    const fetchNextNumber = async () => {
      setIsLoadingNextNumber(true);
      try {
        const data = await apiFetch<Array<{ change_order_number: string }>>(
          `/api/projects/${projectId}/commitment-change-orders?contract_id=${selectedContractId}`,
        );
        const existing = (Array.isArray(data) ? data : (data as { data?: Array<{ change_order_number: string }> }).data ?? []);
        const maxNum = existing.reduce((max, co) => {
          const n = parseInt(co.change_order_number, 10);
          return isNaN(n) ? max : Math.max(max, n);
        }, 0);
        form.setValue("change_order_number", String(maxNum + 1).padStart(3, "0"));
      } catch {
        form.setValue("change_order_number", "001");
      } finally {
        setIsLoadingNextNumber(false);
      }
    };
    fetchNextNumber();
  }, [selectedContractId, projectId, form]);

  // ── Fetch contacts (lazy) ─────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    if (contactsFetched.current) return;
    contactsFetched.current = true;
    try {
      const data = await apiFetch<Array<{ id: string; name: string }>>(
        `/api/projects/${projectId}/contacts`,
      );
      setContacts(data.map((c) => ({ id: c.id, name: c.name })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load contacts");
      contactsFetched.current = false;
    }
  }, [projectId]);

  // ── Fetch change events for pre-fill ─────────────────────────────
  useEffect(() => {
    if (!hasChangeEvents) return;
    const fetchChangeEvents = async () => {
      setIsLoadingChangeEvents(true);
      try {
        const results = await Promise.all(
          changeEventIds.map(async (id) => {
            try {
              const data = await apiFetch<Record<string, unknown>>(
                `/api/projects/${projectId}/change-events/${id}`,
              );
              return {
                id: String(data.id),
                number: data.number ? String(data.number) : null,
                title: String(data.title ?? ""),
                reason: data.reason ? String(data.reason) : null,
              } as ChangeEventSummary;
            } catch {
              return null;
            }
          }),
        );
        setChangeEvents(results.filter(Boolean) as ChangeEventSummary[]);
      } catch {
        toast.error("Could not load change event details.");
      } finally {
        setIsLoadingChangeEvents(false);
      }
    };
    fetchChangeEvents();
     
  }, [projectId, changeEventIdsParam]);

  const applyChangeEventDefaults = useCallback(
    (events: ChangeEventSummary[]) => {
      if (events.length === 0) return;
      const ceWithReason = events.find((ce) => ce.reason);
      if (ceWithReason?.reason) {
        const matched = CHANGE_REASONS.find(
          (r) => r.toLowerCase() === ceWithReason.reason!.toLowerCase(),
        );
        if (matched) form.setValue("change_reason", matched);
      }
      const count = events.length;
      const ceLabel =
        count === 1
          ? `CE ${events[0].number ?? ""} — ${events[0].title}`
          : `${count} change events`;
      form.setValue("title", `CCO for ${ceLabel}`.trim());
    },
    [form],
  );

  useEffect(() => {
    if (hasChangeEvents && changeEvents.length > 0 && !isLoadingChangeEvents) {
      applyChangeEventDefaults(changeEvents);
    }
  }, [hasChangeEvents, changeEvents, isLoadingChangeEvents, applyChangeEventDefaults]);

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const created = await apiFetch<{ id: string }>(
        `/api/projects/${projectId}/commitment-change-orders`,
        {
          method: "POST",
          body: JSON.stringify({
            contract_id: data.contract_id,
            change_order_number: data.change_order_number,
            revision: data.revision ?? 0,
            title: data.title,
            description: data.description || null,
            status: data.status,
            is_private: data.is_private,
            change_reason: data.change_reason || null,
            due_date: data.due_date || null,
            invoiced_date: data.invoiced_date || null,
            paid_date: data.paid_date || null,
            designated_reviewer: data.designated_reviewer || null,
            request_received_from: data.request_received_from || null,
            executed: data.executed,
            signed_co_received_date: data.signed_co_received_date || null,
            schedule_impact: data.schedule_impact ?? null,
            location: data.location || null,
            reference: data.reference || null,
            field_change: data.field_change,
            paid_in_full: data.paid_in_full,
            contract_company: selectedCommitment?.company_name ?? null,
            change_event_ids: hasChangeEvents ? changeEventIds : undefined,
            amount: 0,
          }),
        },
      );

      toast.success("Commitment change order created");
      router.push(`/${projectId}/change-orders/commitment/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingCommitments || isLoadingChangeEvents;
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <PageShell
      variant="form"
      title="Create Commitment Change Order"
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${projectId}/change-orders?tab=commitment`)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create"
            )}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">

            {/* Source Change Events */}
            {hasChangeEvents && changeEvents.length > 0 && (
              <section>
                <SectionRuleHeading
                  label={`Source Change Event${changeEvents.length === 1 ? "" : "s"} (${changeEvents.length})`}
                  className="[&_span]:text-primary"
                />
                <div className="space-y-1.5">
                  {changeEvents.map((ce) => (
                    <div
                      key={ce.id}
                      className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {ce.number ? `CE ${ce.number}` : "CE"}
                      </span>
                      <span className="text-muted-foreground truncate">{ce.title}</span>
                      {ce.reason && (
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {ce.reason}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* General Information */}
            <section className="space-y-4">
              <SectionRuleHeading label="General Information" className="[&_span]:text-primary" />
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">

                {/* # (auto-generated CO number) */}
                <FormField
                  control={form.control}
                  name="change_order_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>#</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="001"
                            className={isLoadingNextNumber ? "opacity-50" : ""}
                          />
                        </FormControl>
                        {isLoadingNextNumber && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Revision */}
                <FormField
                  control={form.control}
                  name="revision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revision</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)
                          }
                          placeholder=""
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contract (Commitment selector) */}
                <FormField
                  control={form.control}
                  name="contract_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract *</FormLabel>
                      <FormControl>
                        <CommitmentCombobox
                          value={field.value}
                          onChange={field.onChange}
                          commitments={commitments}
                          search={commitmentSearch}
                          onSearchChange={setCommitmentSearch}
                          open={commitmentOpen}
                          onOpenChange={setCommitmentOpen}
                          isLoading={isLoadingCommitments}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contract Company (derived, read-only) */}
                <FormItem>
                  <FormLabel>Contract Company</FormLabel>
                  <Input
                    value={selectedCommitment?.company_name ?? ""}
                    disabled
                    placeholder="Determined by selected contract"
                  />
                </FormItem>

                {/* Date Created (read-only) */}
                <FormItem>
                  <FormLabel>Date Created</FormLabel>
                  <Input value={today} disabled />
                </FormItem>

                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Change order title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CCO_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Private */}
                <FormField
                  control={form.control}
                  name="is_private"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 pt-6">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Private</FormLabel>
                    </FormItem>
                  )}
                />

                {/* Change Reason */}
                <FormField
                  control={form.control}
                  name="change_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Change Reason</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                        value={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {CHANGE_REASONS.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Due Date */}
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Invoiced Date */}
                <FormField
                  control={form.control}
                  name="invoiced_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoiced Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Paid Date */}
                <FormField
                  control={form.control}
                  name="paid_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Designated Reviewer */}
                <FormField
                  control={form.control}
                  name="designated_reviewer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designated Reviewer</FormLabel>
                      <ContactCombobox
                        value={field.value}
                        onChange={field.onChange}
                        contacts={contacts}
                        search={reviewerSearch}
                        onSearchChange={setReviewerSearch}
                        open={reviewerOpen}
                        onOpenChange={(open) => {
                          setReviewerOpen(open);
                          if (open) void fetchContacts();
                        }}
                        placeholder="Select a reviewer"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Request Received From */}
                <FormField
                  control={form.control}
                  name="request_received_from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Received From</FormLabel>
                      <ContactCombobox
                        value={field.value}
                        onChange={field.onChange}
                        contacts={contacts}
                        search={requestFromSearch}
                        onSearchChange={setRequestFromSearch}
                        open={requestFromOpen}
                        onOpenChange={(open) => {
                          setRequestFromOpen(open);
                          if (open) void fetchContacts();
                        }}
                        placeholder="Select or type a name"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reviewer (read-only) */}
                <FormItem>
                  <FormLabel>Reviewer</FormLabel>
                  <Input value="" disabled placeholder="Populated after review" />
                </FormItem>

                {/* Review Date (read-only) */}
                <FormItem>
                  <FormLabel>Review Date</FormLabel>
                  <Input value="" disabled placeholder="Populated after review" />
                </FormItem>
              </div>
            </section>

            {/* Details */}
            <section className="space-y-4">
              <SectionRuleHeading label="Details" className="[&_span]:text-primary" />
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={4}
                          placeholder="Describe the change…"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Executed */}
                <FormField
                  control={form.control}
                  name="executed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 pt-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Executed</FormLabel>
                    </FormItem>
                  )}
                />

                {/* Signed CO Received Date */}
                <FormField
                  control={form.control}
                  name="signed_co_received_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signed Change Order Received Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Schedule Impact */}
                <FormField
                  control={form.control}
                  name="schedule_impact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule Impact (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)
                          }
                          placeholder=""
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Site location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reference */}
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Reference number or code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Field Change */}
                <FormField
                  control={form.control}
                  name="field_change"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 pt-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Field Change</FormLabel>
                    </FormItem>
                  )}
                />

                {/* Paid in Full */}
                <FormField
                  control={form.control}
                  name="paid_in_full"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 pt-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Paid in Full</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Attachments placeholder */}
            <section>
              <SectionRuleHeading label="Attachments" className="[&_span]:text-primary" />
              <div className="flex items-center justify-center rounded-md border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Attach files after creating the change order.
                  </p>
                </div>
              </div>
            </section>

          </form>
        </Form>
      )}
    </PageShell>
  );
}
