"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { PageShell, SectionRuleHeading } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ds";
import { Text } from "@/components/ds/text";

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
  description: z.string().max(5000).nullable().optional(),
  change_reason: z.string().nullable().optional(),
  schedule_impact: z.number().int().nullable().optional(),
  due_date: z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewPrimeContractPcoPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;

  // Change event IDs passed from the change events page
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

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      prime_contract_id: "",
      title: "",
      description: "",
      change_reason: null,
      schedule_impact: null,
      due_date: null,
    },
  });

  const selectedContractId = form.watch("prime_contract_id");
  const selectedContract = contracts.find((c) => c.id === selectedContractId);
  const contractCompany =
    selectedContract?.client?.name ?? selectedContract?.vendor?.name ?? null;

  // ── Fetch prime contracts ──────────────────────────────────────────
  useEffect(() => {
    const fetchContracts = async () => {
      setIsLoadingContracts(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/contracts`);
        if (!res.ok) throw new Error("Failed to load contracts");
        const data: PrimeContract[] = await res.json();
        setContracts(data);
      } catch {
        toast.error("Could not load prime contracts.");
      } finally {
        setIsLoadingContracts(false);
      }
    };
    fetchContracts();
  }, [projectId]);

  // ── Fetch change event details for pre-fill ────────────────────────
  const applyChangeEventDefaults = useCallback(
    (events: ChangeEventSummary[], contractList: PrimeContract[]) => {
      if (events.length === 0) return;

      // Pre-fill prime contract from the first CE that has one
      const ceWithContract = events.find((ce) => ce.prime_contract_id);
      if (ceWithContract?.prime_contract_id) {
        const matchingContract = contractList.find(
          (c) => c.id === ceWithContract.prime_contract_id,
        );
        if (matchingContract) {
          form.setValue("prime_contract_id", matchingContract.id);
        }
      }

      // Pre-fill change reason from the first CE that has one
      const ceWithReason = events.find((ce) => ce.reason);
      if (ceWithReason?.reason) {
        // Match against our CHANGE_REASONS list (case-insensitive)
        const matched = CHANGE_REASONS.find(
          (r) => r.toLowerCase() === ceWithReason.reason!.toLowerCase(),
        );
        if (matched) {
          form.setValue("change_reason", matched);
        } else {
          form.setValue("change_reason", ceWithReason.reason);
        }
      }

      // Auto-generate title
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
        // Fetch each CE's summary data
        const results = await Promise.all(
          changeEventIds.map(async (id) => {
            const res = await fetch(
              `/api/projects/${projectId}/change-events/${id}`,
            );
            if (!res.ok) return null;
            const data = await res.json();
            return {
              id: data.id,
              number: data.number,
              title: data.title,
              reason: data.reason,
              prime_contract_id: data.prime_contract_id
                ? String(data.prime_contract_id)
                : data.primeContractId
                  ? String(data.primeContractId)
                  : null,
            } as ChangeEventSummary;
          }),
        );
        const fetched = results.filter(Boolean) as ChangeEventSummary[];
        setChangeEvents(fetched);
      } catch {
        toast.error("Could not load change event details.");
      } finally {
        setIsLoadingChangeEvents(false);
      }
    };

    fetchChangeEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, changeEventIdsParam]);

  // Apply defaults once both contracts and change events are loaded
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

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    try {
      if (hasChangeEvents) {
        // Use the add-to-pco endpoint to create PCO + link change events + copy line items
        const res = await fetch(
          `/api/projects/${projectId}/change-events/add-to-pco`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              change_event_ids: changeEventIds,
              pco_type: "prime",
              create_new: {
                title: data.title,
                prime_contract_id: data.prime_contract_id,
                description: data.description || undefined,
              },
            }),
          },
        );

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          const message =
            payload && typeof payload === "object" && "error" in payload
              ? String(payload.error)
              : "Failed to create PCO";
          throw new Error(message);
        }

        const result = await res.json();
        const pcoId = result?.pco?.id;

        toast.success("Prime Contract PCO created with linked change events");

        if (pcoId) {
          router.push(`/${projectId}/prime-contract-pcos/${pcoId}`);
        } else {
          router.push(`/${projectId}/prime-contract-pcos`);
        }
      } else {
        // Direct PCO creation (no change events)
        const res = await fetch(
          `/api/projects/${projectId}/prime-contract-pcos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prime_contract_id: data.prime_contract_id,
              title: data.title,
              description: data.description || null,
              schedule_impact: data.schedule_impact,
              due_date: data.due_date || null,
            }),
          },
        );

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          const message =
            payload && typeof payload === "object" && "error" in payload
              ? String(payload.error)
              : "Failed to create PCO";
          throw new Error(message);
        }

        const created = await res.json();
        toast.success("Prime Contract PCO created");
        router.push(`/${projectId}/prime-contract-pcos/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create PCO");
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
              router.push(`/${projectId}/prime-contract-pcos`)
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
            {isSubmitting ? "Creating…" : "Create"}
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
              <section className="space-y-4">
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
            <section className="space-y-6">
              <SectionRuleHeading
                label="General Information"
                className="[&_span]:text-primary"
              />
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
                {/* Prime Contract */}
                <FormField
                  control={form.control}
                  name="prime_contract_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prime Contract *</FormLabel>
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

                {/* Contract Company (read-only, derived from selected contract) */}
                <FormItem>
                  <FormLabel>Contract Company</FormLabel>
                  <Input
                    value={contractCompany ?? ""}
                    disabled
                    placeholder="Determined by selected contract"
                  />
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
                          placeholder="days"
                        />
                      </FormControl>
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
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>
            </section>
          </form>
        </Form>
      )}
    </PageShell>
  );
}
