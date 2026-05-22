"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import type { Database } from "@/types/database.types";
import {
  PunchItemFormFields,
  buildPunchItemDefaults,
  punchItemFormSchema,
  type PunchItemFormValues,
} from "./punch-item-form-fields";

// Re-export so existing callers (e.g. punch list page) keep working.
export type { PunchItemFormValues };

type PunchItemRow = Database["public"]["Tables"]["punch_items"]["Row"];

interface PunchItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PunchItemFormValues) => void;
  defaultValues?: Partial<PunchItemRow>;
  isLoading?: boolean;
  mode?: "create" | "edit";
  projectId?: number;
}

export function PunchItemFormDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading = false,
  mode = "create",
  projectId,
}: PunchItemFormDialogProps) {
  const form = useForm<PunchItemFormValues>({
    resolver: zodResolver(punchItemFormSchema),
    reValidateMode: "onBlur",
    defaultValues: buildPunchItemDefaults(defaultValues),
  });

  useEffect(() => {
    if (open) {
      form.reset(buildPunchItemDefaults(defaultValues));
    }
  }, [open, defaultValues, form]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {/* eslint-disable-next-line design-system/no-arbitrary-spacing */}
      <ModalContent size="3xl" className="max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <ModalHeader>
          <ModalTitle>
            {mode === "create" ? "Create Punch Item" : "Edit Punch Item"}
          </ModalTitle>
        </ModalHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            const firstErrorKey = Object.keys(errors)[0] as keyof PunchItemFormValues;
            if (firstErrorKey) form.setFocus(firstErrorKey);
          })}
          className="space-y-4"
        >
          <PunchItemFormFields form={form} projectId={projectId} />

          {/* sticky keeps footer pinned at the bottom of the scroll container so buttons are always reachable */}
          <ModalFooter className="sticky -bottom-6 z-10 -mx-6 -mb-6 px-6 pt-4 pb-6 bg-background border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create Punch Item"
                  : "Save Changes"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
