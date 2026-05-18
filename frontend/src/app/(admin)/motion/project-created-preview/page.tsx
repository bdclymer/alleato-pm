"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout";
import { ProjectCreatedModal } from "@/components/project/ProjectCreatedModal";

export default function ProjectCreatedPreviewPage() {
  const [open, setOpen] = useState(true);

  return (
    <PageShell variant="content" title="Project Created Modal — Preview">
      <div className="flex flex-col items-center justify-center gap-6 p-8">
        <p className="text-sm text-muted-foreground">
          Toggle the modal to inspect the redesigned success state.
        </p>

        <Button onClick={() => setOpen(true)} size="lg">
          Open Modal
        </Button>

        <ProjectCreatedModal
          isOpen={open}
          onClose={() => setOpen(false)}
          onViewDashboard={() => setOpen(false)}
          projectId="preview"
          projectName="Wing House"
        />
      </div>
    </PageShell>
  );
}
