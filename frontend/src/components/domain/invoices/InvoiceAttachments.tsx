"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InvoiceAttachments() {
  return (
    <section>
      <h3 className="text-base font-semibold text-foreground mb-4">
        Attachments
      </h3>

      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Upload className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Once you or your team upload attachments, you can view them here.
        </p>
        <Button variant="outline" size="sm">
          Upload Attachments
        </Button>
      </div>
    </section>
  );
}
