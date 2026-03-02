"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Save, Send } from "lucide-react";

import { PageContainer , ProjectPageHeader } from "@/components/layout";

import { FormContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useCreateRfi } from "@/hooks/use-rfis";
import {
  rfiDraftSchema,
  rfiOpenSchema,
  RFI_IMPACT_OPTIONS,
  type RfiFormValues,
} from "@/lib/schemas/rfi-schema";

export default function NewRfiPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.projectId);
  const createRfi = useCreateRfi(projectId);

  const form = useForm<RfiFormValues>({
    defaultValues: {
      subject: "",
      question: "",
      due_date: null,
      assignees: [],
      rfi_manager: null,
      received_from: null,
      responsible_contractor: null,
      distribution_list: [],
      location: null,
      specification: null,
      cost_code: null,
      schedule_impact: null,
      cost_impact: null,
      reference: null,
      is_private: false,
      rfi_stage: null,
    },
  });

  const submitRfi = async (status: "draft" | "open") => {
    const data = form.getValues();
    const schema = status === "open" ? rfiOpenSchema : rfiDraftSchema;
    const result = schema.safeParse(data);

    if (!result.success) {
      // Set form errors from Zod validation
      for (const issue of result.error.issues) {
        const path = issue.path[0] as keyof RfiFormValues;
        if (path) {
          form.setError(path, { message: issue.message });
        }
      }
      return;
    }

    try {
      await createRfi.mutateAsync({ ...result.data, status });
      router.push(`/${projectId}/rfis`);
    } catch {
      // Error handled by mutation onError
    }
  };

  const handleSaveAsDraft = () => submitRfi("draft");
  const handleCreateOpen = () => submitRfi("open");

  return (
    <>
      <ProjectPageHeader
        title="New RFI"
        description="Create a new Request for Information"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${projectId}/rfis`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to RFIs
          </Button>
        }
      />
      <PageContainer>
        <FormContainer maxWidth="lg">
          <Form {...form}>
            <form className="space-y-8">
              {/* Required Fields */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  RFI Details
                </h3>

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter RFI subject" {...field} />
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
                      <FormLabel>
                        Question (required for Open)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the information you need..."
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
                        <FormLabel>
                          Due Date (required for Open)
                        </FormLabel>
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
                          <Input
                            placeholder="Enter RFI manager name"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Assignees */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  Assignment
                </h3>

                <FormField
                  control={form.control}
                  name="assignees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Assignees (required for Open)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter assignee names (comma-separated)"
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
                          <Input
                            placeholder="Enter sender name"
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
                    name="responsible_contractor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsible Contractor</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter contractor name"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="distribution_list"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distribution List</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter distribution list (comma-separated)"
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
              </section>

              {/* Additional Details */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  Additional Details
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter location"
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
                    name="specification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specification</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter specification section"
                            {...field}
                            value={field.value ?? ""}
                          />
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
                          <Input
                            placeholder="Enter cost code"
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
                    name="rfi_stage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RFI Stage</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter RFI stage"
                            {...field}
                            value={field.value ?? ""}
                          />
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

                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter reference"
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
                  name="is_private"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-4 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Private</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </section>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/${projectId}/rfis`)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveAsDraft}
                  disabled={createRfi.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateOpen}
                  disabled={createRfi.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Create Open
                </Button>
              </div>
            </form>
          </Form>
        </FormContainer>
      </PageContainer>
    </>
  );
}
