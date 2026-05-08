"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { regenerateExecutiveBriefingAction } from "@/app/(main)/actions/executive-briefing-actions";

export function ExecutiveBriefingRefreshButton({
  windowDays,
}: {
  windowDays: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const regenerate = () => {
    const formData = new FormData();
    formData.set("windowDays", String(windowDays));

    startTransition(async () => {
      try {
        await regenerateExecutiveBriefingAction(formData);
        router.refresh();
        toast.success("Executive brief regenerated with the latest source data.");
      } catch (caught) {
        toast.error(
          caught instanceof Error
            ? caught.message
            : "Executive brief regeneration failed.",
        );
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2"
      disabled={isPending}
      onClick={regenerate}
      title="Regenerate this executive brief with the latest source data"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      {isPending ? "Regenerating..." : "Regenerate"}
    </Button>
  );
}
