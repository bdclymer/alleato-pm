"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Edit2,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUpdateRfi, useDeleteRfi } from "@/hooks/use-rfis";
import {
  rfiEditSchema,
  RFI_STATUS_OPTIONS,
  RFI_STATUS_VARIANT_MAP,
  RFI_IMPACT_OPTIONS,
  type RfiEditValues,
} from "@/lib/schemas/rfi-schema";
import type { RFI } from "@/types/database-extensions";
import { RfiResponses } from "@/components/rfis/rfi-responses";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    open: "default",
    closed: "default",
    "closed-draft": "secondary",
  };
  return map[status] ?? "outline";
}

function formatStatusLabel(status: string): string {
  if (status === "closed-draft") return "Closed (Draft)";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface RfiDetailProps {
  rfi: RFI | null;
  projectId: number;
}

export function RfiDetail({ rfi, projectId }: RfiDetailProps) {
  const router = useRouter();
  const updateRfi = useUpdateRfi(projectId);
  const deleteRfi = useDeleteRfi(projectId);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<RfiEditValues>({
    resolver: zodResolver(rfiEditSchema),
    defaultValues: {
      subject: rfi?.subject ?? "",
      question: rfi?.question ?? "",
      due_date: rfi?.due_date ?? null,
      assignees: rfi?.assignees ?? [],
      rfi_manager: rfi?.rfi_manager ?? null,
      received_from: rfi?.received_from ?? null,
      responsible_contractor: rfi?.responsible_contractor ?? null,
      distribution_list: rfi?.distribution_list ?? [],
      location: rfi?.location ?? null,
      specification: rfi?.specification ?? null,
      cost_code: rfi?.cost_code ?? null,
      schedule_impact: rfi?.schedule_impact ?? null,
      cost_impact: rfi?.cost_impact ?? null,
      reference: rfi?.reference ?? null,
      is_private: rfi?.is_private ?? false,
      rfi_stage: rfi?.rfi_stage ?? null,
      drawing_number: rfi?.drawing_number ?? null,
    },
  });

  if (!rfi) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        RFI not found.
      </div>
    );
  }

  const handleSave = async (data: RfiEditValues) => {
    await updateRfi.mutateAsync({ rfiId: rfi.id, data });
    setIsEditing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    await deleteRfi.mutateAsync(rfi.id);
    router.push(`/${projectId}/rfis`);
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateRfi.mutateAsync({
      rfiId: rfi.id,
      data: { status: newStatus } as Record<string, unknown> & RfiEditValues,
    });
    router.refresh();
  };

  const handleCancelEdit = () => {
    form.reset();
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${projectId}/rfis`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to RFIs
        </Button>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete RFI #{rfi.number}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      this RFI.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={form.handleSubmit(handleSave)}
                disabled={updateRfi.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        /* Edit Mode */
        <Form {...form}>
          <form className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>RFI Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject *</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[120px]"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rfi_manager"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RFI Manager</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="assignees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignees</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Comma-separated names"
                          value={(field.value ?? []).join(", ")}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(
                              val
                                ? val.split(",").map((s) => s.trim()).filter(Boolean)
                                : [],
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="received_from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Received From</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsible_contractor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsible Contractor</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specification</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="cost_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Code</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rfi_stage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RFI Stage</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="schedule_impact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Impact</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RFI_IMPACT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cost_impact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Impact</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RFI_IMPACT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="drawing_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drawing Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="Enter drawing/sheet number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="is_private"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-4 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Private</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </form>
        </Form>
      ) : (
        /* View Mode */
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Question</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(rfi.status ?? "open")}>
                      {formatStatusLabel(rfi.status ?? "open")}
                    </Badge>
                    {rfi.is_private && (
                      <Badge variant="outline">Private</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {rfi.question ? (
                    <p className="whitespace-pre-wrap">{rfi.question}</p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      No question provided.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Responses Section (Liveblocks threads) */}
            <RfiResponses rfiId={rfi.id} className="mt-6" />

            {/* Status Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {rfi.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange("open")}
                      disabled={updateRfi.isPending}
                    >
                      Open RFI
                    </Button>
                  )}
                  {rfi.status === "open" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatusChange("closed")}
                      disabled={updateRfi.isPending}
                    >
                      Close RFI
                    </Button>
                  )}
                  {(rfi.status === "closed" || rfi.status === "closed-draft") && (
                    <Button
                      size="sm"
                      onClick={() =>
                        handleStatusChange(
                          rfi.status === "closed-draft" ? "draft" : "open"
                        )
                      }
                      disabled={updateRfi.isPending}
                    >
                      Reopen RFI
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow label="RFI #" value={String(rfi.number ?? "")} />
                <InfoRow label="Due Date" value={formatDate(rfi.due_date)} />
                <InfoRow
                  label="Date Initiated"
                  value={formatDate(rfi.date_initiated)}
                />
                <InfoRow
                  label="Closed Date"
                  value={formatDate(rfi.closed_date)}
                />
                <InfoRow
                  label="Ball In Court"
                  value={rfi.ball_in_court ?? "—"}
                />
                <InfoRow
                  label="RFI Manager"
                  value={rfi.rfi_manager ?? "—"}
                />
                <InfoRow
                  label="Received From"
                  value={rfi.received_from ?? "—"}
                />
                <InfoRow
                  label="Resp. Contractor"
                  value={rfi.responsible_contractor ?? "—"}
                />
                <InfoRow
                  label="Assignees"
                  value={
                    rfi.assignees?.length
                      ? rfi.assignees.join(", ")
                      : "—"
                  }
                />
                <InfoRow label="Location" value={rfi.location ?? "—"} />
                <InfoRow
                  label="Specification"
                  value={rfi.specification ?? "—"}
                />
                <InfoRow label="Cost Code" value={rfi.cost_code ?? "—"} />
                <InfoRow
                  label="Schedule Impact"
                  value={rfi.schedule_impact ?? "—"}
                />
                <InfoRow
                  label="Cost Impact"
                  value={rfi.cost_impact ?? "—"}
                />
                <InfoRow label="Reference" value={rfi.reference ?? "—"} />
                <InfoRow
                  label="Drawing Number"
                  value={rfi.drawing_number ?? "—"}
                />
                <InfoRow label="RFI Stage" value={rfi.rfi_stage ?? "—"} />
                <InfoRow
                  label="Created By"
                  value={rfi.created_by ?? "—"}
                />
                <InfoRow
                  label="Created"
                  value={formatDate(rfi.created_at)}
                />
                <InfoRow
                  label="Updated"
                  value={formatDate(rfi.updated_at)}
                />
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">
        {value}
      </span>
    </div>
  );
}
