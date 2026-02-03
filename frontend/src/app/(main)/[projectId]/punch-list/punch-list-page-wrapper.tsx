"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PunchListClient } from "./punch-list-client";
import {
  PunchItemFormDialog,
  type PunchItemFormValues,
} from "@/components/domain/punch-items/punch-item-form-dialog";
import { useCreatePunchItem } from "@/hooks/use-punch-items";

interface PunchListPageWrapperProps {
  projectId: number;
}

export function PunchListPageWrapper({ projectId }: PunchListPageWrapperProps) {
  const [formOpen, setFormOpen] = useState(false);
  const createMutation = useCreatePunchItem(projectId);

  const handleCreate = (data: PunchItemFormValues) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setFormOpen(false);
      },
    });
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Punch Item
        </Button>
      </div>
      <PunchListClient projectId={projectId} />
      <PunchItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        mode="create"
      />
    </>
  );
}
