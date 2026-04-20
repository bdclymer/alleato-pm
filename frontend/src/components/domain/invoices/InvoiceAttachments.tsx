"use client";

import { Upload } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { SectionRuleHeading } from "@/components/layout/spacing";

export function InvoiceAttachments() {
  return (
    <section>
      <SectionRuleHeading label="Attachments" />

      <EmptyState
        icon={<Upload />}
        title="No attachments yet"
        description="Once you or your team upload attachments, you can view them here."
        action={<Button variant="outline"><Upload />Upload Attachments</Button>}
      />
    </section>
  );
}
