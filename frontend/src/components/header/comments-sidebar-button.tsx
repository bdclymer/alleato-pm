"use client";

import { usePathname, useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CommentsSidebarButton() {
  const router = useRouter();
  const pathname = usePathname();
  const active = pathname === "/comments";

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "relative h-8 w-8 p-0 transition-colors",
        active
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-label="Comments"
      aria-pressed={active}
      onClick={() => router.push("/comments")}
    >
      <MessageSquare className="h-4 w-4" />
    </Button>
  );
}
