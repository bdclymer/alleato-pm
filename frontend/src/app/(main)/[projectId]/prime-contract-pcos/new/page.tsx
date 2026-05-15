"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Text } from "@/components/ds/text";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";

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
];

const PCO_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending - In Review" },
  { value: "approved", label: "Approved" },
  { value: "void", label: "Void" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrimeContract {
  id: string;
  contract_number: string;
  title: string | null;
  status: string | null;
  client: { id: string; name: string } | null;
  vendor: { id: string; name: string } | null;
}

interface ChangeOrder {
  id: number;
  pcco_number: string | null;
  title: string;
  status: string | null;
}

interface Contact {
  id: string;
  name: string;
}

interface ChangeEventSummary {
  id: string;
  number: string | null;
  title: string;
  reason: string | null;
  prime_contract_id: string | null;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  prime_contract_id: z.string().uuid("Select a prime contract"),
  title: z.string().min(1, "Title is required").max(255),
  status: z.enum(["draft", "pending", "approved", "void"]),
  revision: z.number().int().nullable().optional(),
  change_reason: z.string().nullable().optional(),
  is_private: z.boolean(),
  description: z.string().max(5000).nullable().optional(),
  executed: z.boolean(),
  signed_co_received_date: z.string().nullable().optional(),
  request_received_from: z.string().max(255).nullable().optional(),
  location: z.string().max(255).nullable().optional(),
  schedule_impact: z.number().int().nullable().optional(),
  field_change: z.boolean(),
  reference: z.string().max(255).nullable().optional(),
  paid_in_full: z.boolean(),
  // CO linkage — handled as side state, not a direct form field
});

type FormData = z.infer<typeof schema>;

type CoLinkMode = "none" | "existing" | "create_new";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewPrimeContractPcoPage() {
  const router = useRouter();
  const params = useParams()!;
  const searchParams = useSearchParams()!;
  const projectId = params.projectId as string;
  const contractIdFromRoute =
    typeof params.contractId === "string" ? params.contractId : null;
  const contractIdFromQuery = searchParams.get("contractId");
  const contractContextId = contractIdFromRoute ?? contractIdFromQuery;

  const changeEventIdsParam = searchParams.get("changeEventIds");
  const changeEventIds = changeEventIdsParam
    ? changeEventIdsParam.split(",").filter(Boolean)
    : [];
  const hasChangeEvents = changeEventIds.length > 0;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contracts, setContracts] = useState<PrimeContract[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(true);
  const [changeEvents, setChangeEvents] = useState<ChangeEventSummary[]>([]);
  const [isLoadingChangeEvents, setIsLoadingChangeEvents] = useState(false);

  // CO linkage state
  const [coLinkMode, setCoLinkMode] = useState<CoLinkMode>("none");
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [isLoadingCOs, setIsLoadingCOs] = useState(false);
  const [selectedCoId, setSelectedCoId] = useState<string>("");

  // Contacts combobox state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [contactsOpen, setContactsOpen] = useState(false);
  const contactsFetched = useRef(false);
  const [createdByLabel, setCreatedByLabel] = useState("You");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      prime_contract_id: "",
      title: "",
      status: "draft",
      revision: null,
      change_reason: null,
      is_private: false,
      description: "",
      executed: false,
      signed_co_received_date: null,
      request_received_from: null,
      location: null,
      schedule_impact: null,
      field_change: false,
      reference: null,
      paid_in_full: false,
    },
  });

  const selectedContractId = form.watch("prime_contract_id");
  const selectedContract = contracts.find((c) => c.id === selectedContractId);
  const contractCompany =
    selectedContract?.client?.name ?? selectedContract?.vendor?.name ?? null;
  const createdDateLabel = new Intl.DateTimeFormat("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const buildPcoDetailPath = useCallback(
    (pcoId: string, primeContractId?: string | null) => {
      const resolvedContractId = primeContractId ?? contractContextId;
      if (resolvedContractId) {
        return `/${projectId}/prime-contracts/${resolvedContractId}/change-orders/pcos/${pcoId}`;
      }
      return `/${projectId}/prime-contract-pcos/${pcoId}`;
    },
    [projectId, contractContextId],
  );

  // ── Fetch prime contracts ──────────────────────────────────────────
  useEffect(() => {
    const fetchContracts = async () => {
      setIsLoadingContracts(true);
      try {
        const data = await apiFetch<PrimeContract[]>(
          `/api/projects/${projectId}/contracts`,
        );
        setContracts(data);
      } catch {
        toast.error("Could not load prime contracts.");
      } finally {
        setIsLoadingContracts(false);
      }
    };
    fetchContracts();
  }, [projectId]);

  // ── Fetch change orders when "add to existing" is selected ─────────
  useEffect(() => {
    if (coLinkMode !== "existing") return;
    if (changeOrders.length > 0) return;

    const fetchCOs = async () => {
      setIsLoadingCOs(true);
      try {
        const data = await apiFetch<ChangeOrder[]>(
          `/api/projects/${projectId}/prime-contract-change-orders`,
        );
        setChangeOrders(data.filter((co) => co.status !== "void"));
      } catch {
        toast.error("Could not load prime contract change orders.");
      } finally {
        setIsLoadingCOs(false);
      }
    };
    fetchCOs();
  }, [coLinkMode, projectId, changeOrders.length]);

  // ── Fetch contacts (lazy, once on open) ───────────────────────────
  const fetchContacts = useCallback(async () => {
    if (contactsFetched.current) return;
    contactsFetched.current = true;
    try {
      const data = await apiFetch<Array<{ id: string; name: string; email: string | null; person_type: string | null }>>(
        `/api/projects/${projectId}/contacts`,
      );
      setContacts(data.map((c) => ({ id: c.id, name: c.name })));
    } catch (err) {
      toast.error("Could not load contacts");
      contactsFetched.current = false; // allow retry
    }
  }, [projectId]);

  // ── Fetch change event details for pre-fill ────────────────────────
  const applyChangeEventDefaults = useCallback(
    (events: ChangeEventSummary[], contractList: PrimeContract[]) => {
      if (events.length === 0) return;

      const ceWithContract = events.find((ce) => ce.prime_contract_id);
      if (ceWithContract?.prime_contract_id) {
        const matchingContract = contractList.find(
          (c) => c.id === ceWithContract.prime_contract_id,
        );
        if (matchingContract) {
          form.setValue("prime_contract_id", matchingContract.id);
        }
      }

      const ceWithReason = events.find((ce) => ce.reason);
      if (ceWithReason?.reason) {
        const matched = CHANGE_REASONS.find(
          (r) => r.toLowerCase() === ceWithReason.reason!.toLowerCase(),
        );
        form.setValue("change_reason", matched ?? ceWithReason.reason);
      }

      const count = events.length;
      const ceLabel =
        count === 1
          ? `CE ${events[0].number ?? ""} — ${events[0].title}`
          : `${count} change events`;
      form.setValue("title", `PCO for ${ceLabel}`.trim());
    },
    [form],
  );

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
                prime_contract_id: data.prime_contract_id
                  ? String(data.prime_contract_id)
                  : data.primeContractId
                    ? String(data.primeContractId)
                    : null,
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

  useEffect(() => {
    if (
      hasChangeEvents &&
      changeEvents.length > 0 &&
      contracts.length > 0 &&
      !isLoadingContracts &&
      !isLoadingChangeEvents
    ) {
      applyChangeEventDefaults(changeEvents, contracts);
    }
  }, [
    hasChangeEvents,
    changeEvents,
    contracts,
    isLoadingContracts,
    isLoadingChangeEvents,
    applyChangeEventDefaults,
  ]);

  useEffect(() => {
    if (!contractContextId || contracts.length === 0) return;
    const hasMatchingContract = contracts.some((c) => c.id === contractContextId);
    if (hasMatchingContract) {
      form.setValue("prime_contract_id", contractContextId);
    }
  }, [contractContextId, contracts, form]);

  useEffect(() => {
    // Resolve current user display label for read-only "Created By" metadata.
    const fetchCurrentUser = async () => {
      try {
        const supabase = createClient();
        const { data: authData, error } = await supabase.auth.getUser();
        if (error || !authData?.user) return;
        const metadata = authData.user.user_metadata as Record<string, unknown> | undefined;
        const fullName = typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "";
        if (fullName.length > 0) {
          setCreatedByLabel(fullName);
          return;
        }
        const email = authData.user.email ?? "";
        if (email.length > 0) {
          setCreatedByLabel(email);
        }
      } catch (error) {
        reportNonCriticalFailure({
          area: "prime-contract-pcos",
          operation: "load-current-user-label",
          error,
          userVisibleFallback: "Created-by label defaults to You.",
          metadata: { projectId },
        });
      }
    };

    void fetchCurrentUser();
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const promotedToCoId =
        coLinkMode === "existing" && selectedCoId
          ? parseInt(selectedCoId, 10)
          : null;

      if (hasChangeEvents) {
        const result = await apiFetch<{ pco?: { id?: string } }>(
          `/api/projects/${projectId}/change-events/add-to-pco`,
          {
            method: "POST",
            body: JSON.stringify({
              change_event_ids: changeEventIds,
              pco_type: "prime",
              create_new: {
                title: data.title,
                prime_contract_id: data.prime_contract_id,
                status: data.status,
                description: data.description || undefined,
                change_reason: data.change_reason || undefined,
                revision: data.revision ?? undefined,
                schedule_impact: data.schedule_impact ?? undefined,
                is_private: data.is_private,
                executed: data.executed,
                signed_co_received_date: data.signed_co_received_date || undefined,
                request_received_from: data.request_received_from || undefined,
                location: data.location || undefined,
                field_change: data.field_change,
                reference: data.reference || undefined,
                paid_in_full: data.paid_in_full,
                promoted_to_co_id: promotedToCoId ?? undefined,
              },
            }),
          },
        );

        toast.success("Prime Contract PCO created with linked change events");
        const pcoId = result?.pco?.id;
        router.push(
          pcoId
            ? buildPcoDetailPath(pcoId, data.prime_contract_id)
            : `/${projectId}/prime-contract-pcos`,
        );
      } else {
        const created = await apiFetch<{ id: string }>(
          `/api/projects/${projectId}/prime-contract-pcos`,
          {
            method: "POST",
            body: JSON.stringify({
              prime_contract_id: data.prime_contract_id,
              title: data.title,
              status: data.status,
              description: data.description || null,
              change_reason: data.change_reason || null,
              revision: data.revision ?? null,
              schedule_impact: data.schedule_impact ?? null,
              is_private: data.is_private,
              executed: data.executed,
              signed_co_received_date: data.signed_co_received_date || null,
              request_received_from: data.request_received_from || null,
              location: data.location || null,
              field_change: data.field_change,
              reference: data.reference || null,
              paid_in_full: data.paid_in_full,
              promoted_to_co_id: promotedToCoId,
            }),
          },
        );

        toast.success("Prime Contract PCO created");
        router.push(buildPcoDetailPath(created.id, data.prime_contract_id));
      }
    } catch (err) {
      toast.error("Failed to create PCO");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingContracts || isLoadingChangeEvents;

  return (
    <PageShell
      variant="form"
      title="Create Prime Contract PCO"
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              contractContextId
                ? router.push(`/${projectId}/prime-contracts/${contractContextId}`)
                : router.push(`/${projectId}/prime-contract-pcos`)
            }
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
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <Text tone="muted">Loading…</Text>
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-8"
          >
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
                      <span className="text-muted-foreground truncate">
                        {ce.title}
                      </span>
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
              <SectionRuleHeading
                label="General Information"
                className="[&_span]:text-primary"
              />
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
                {/* Contract */}
                <FormField
                  control={form.control}
                  name="prime_contract_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a contract" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contracts.map((c) => {
                            const partyName =
                              c.client?.name ?? c.vendor?.name ?? null;
                            const label = [
                              `#${c.contract_number}`,
                              c.title,
                              partyName,
                            ]
                              .filter(Boolean)
                              .join(" — ");
                            return (
                              <SelectItem key={c.id} value={c.id}>
                                {label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contract Company (derived) */}
                <FormItem>
                  <FormLabel>Contract Company</FormLabel>
                  <Input
                    value={contractCompany ?? ""}
                    disabled
                    placeholder="Determined by selected contract"
                  />
                </FormItem>

                {/* PCO Number (read-only preview) */}
                <FormItem>
                  <FormLabel>#</FormLabel>
                  <Input value="Auto-generated on save" disabled />
                </FormItem>

                {/* Date Created (read-only metadata) */}
                <FormItem>
                  <FormLabel>Date Created</FormLabel>
                  <Input value={createdDateLabel} disabled />
                </FormItem>

                {/* Created By (read-only metadata) */}
                <FormItem>
                  <FormLabel>Created By</FormLabel>
                  <Input value={createdByLabel} disabled />
                </FormItem>

                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="PCO title" />
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PCO_STATUSES.map((s) => (
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
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value, 10)
                                : null,
                            )
                          }
                          placeholder=""
                        />
                      </FormControl>
                      <FormMessage />
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
                        onValueChange={(val) =>
                          field.onChange(val === "__none__" ? null : val)
                        }
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
                            <SelectItem key={r} value={r}>
                              {r}
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
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5 leading-none">
                        <FormLabel className="cursor-pointer">Private</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Prime Contract Change Order */}
            <section>
              <SectionRuleHeading
                label="Prime Contract Change Order"
                className="[&_span]:text-primary"
              />
              <div className="space-y-4">
                <RadioGroup
                  value={coLinkMode}
                  onValueChange={(v) => setCoLinkMode(v as CoLinkMode)}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="none" id="co-none" />
                    <Label htmlFor="co-none" className="cursor-pointer">
                      None
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="existing" id="co-existing" />
                    <Label htmlFor="co-existing" className="cursor-pointer">
                      Add to existing Change Order
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="create_new" id="co-new" />
                    <Label htmlFor="co-new" className="cursor-pointer">
                      Create new Change Order
                    </Label>
                  </div>
                </RadioGroup>

                {coLinkMode === "existing" && (
                  <div className="pl-6">
                    {isLoadingCOs ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading change orders…
                      </div>
                    ) : changeOrders.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No open change orders found for this project.
                      </p>
                    ) : (
                      <Select
                        value={selectedCoId}
                        onValueChange={setSelectedCoId}
                      >
                        <SelectTrigger className="w-full max-w-md">
                          <SelectValue placeholder="Select a change order" />
                        </SelectTrigger>
                        <SelectContent>
                          {changeOrders.map((co) => (
                            <SelectItem key={co.id} value={String(co.id)}>
                              {co.pcco_number
                                ? `#${co.pcco_number} — ${co.title}`
                                : co.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {coLinkMode === "create_new" && (
                  <p className="pl-6 text-sm text-muted-foreground">
                    A new Change Order will be created after submitting this PCO.
                  </p>
                )}
              </div>
            </section>

            {/* Details */}
            <section className="space-y-4">
              <SectionRuleHeading
                label="Details"
                className="[&_span]:text-primary"
              />
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
                          placeholder="Describe the potential change…"
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
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5 leading-none">
                        <FormLabel className="cursor-pointer">Executed</FormLabel>
                      </div>
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
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Request Received From */}
                <FormField
                  control={form.control}
                  name="request_received_from"
                  render={({ field }) => {
                    const filtered = contacts.filter((c) =>
                      c.name.toLowerCase().includes(contactSearch.toLowerCase()),
                    );
                    return (
                      <FormItem>
                        <FormLabel>Request Received From</FormLabel>
                        <Popover
                          open={contactsOpen}
                          onOpenChange={(open) => {
                            setContactsOpen(open);
                            if (open) void fetchContacts();
                          }}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value || "Select or type a name"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Search contacts…"
                                value={contactSearch}
                                onValueChange={setContactSearch}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  {contactSearch ? (
                                    <button
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                      onClick={() => {
                                        field.onChange(contactSearch);
                                        setContactsOpen(false);
                                        setContactSearch("");
                                      }}
                                    >
                                      Use &ldquo;{contactSearch}&rdquo;
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
                                        field.onChange(c.name);
                                        setContactsOpen(false);
                                        setContactSearch("");
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === c.name
                                            ? "opacity-100"
                                            : "opacity-0",
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
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value, 10)
                                : null,
                            )
                          }
                          placeholder=""
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
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5 leading-none">
                        <FormLabel className="cursor-pointer">Field Change</FormLabel>
                      </div>
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
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5 leading-none">
                        <FormLabel className="cursor-pointer">Paid in Full</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </section>
          </form>
        </Form>
      )}
    </PageShell>
  );
}
