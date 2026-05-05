"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { SectionRuleHeading } from "@/components/layout/spacing";
import {
  BOARD_STATUSES,
  BOARD_STATUS_LABELS,
  type BoardStatus,
} from "@/lib/admin-feedback/constants";

const SEVERITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const STATUS_COLORS: Record<BoardStatus, string> = {
  submitted: "bg-muted text-muted-foreground",
  in_review: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  planned: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  shipped: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export function AddBoardItemButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [boardStatus, setBoardStatus] = useState<BoardStatus>("submitted");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  function reset() {
    setTitle("");
    setDescription("");
    setBoardStatus("submitted");
    setSeverity("medium");
    setOpen(false);
  }

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/feedback/board/create", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          board_status: boardStatus,
          severity,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["product-board"] });
      reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        New Item
      </Button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-sm"
              onClick={reset}
            />

            {/* Dialog */}
            <motion.div
              key="dialog"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <SectionRuleHeading label="New feature idea" />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Input
                    autoFocus
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-base font-medium"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                </div>

                <div>
                  <Textarea
                    placeholder="Description — context, goals, acceptance criteria…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="resize-none text-sm"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Column</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BOARD_STATUSES.map((s) => (
                      <Button
                        key={s}
                        variant="ghost"
                        size="sm"
                        onClick={() => setBoardStatus(s)}
                        className={cn(
                          "h-7 rounded-full px-3 text-xs font-medium transition-all",
                          boardStatus === s
                            ? STATUS_COLORS[s] + " ring-2 ring-offset-1 ring-current/20"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {BOARD_STATUS_LABELS[s]}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Priority</p>
                  <div className="flex gap-1.5">
                    {SEVERITY_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant="ghost"
                        size="sm"
                        onClick={() => setSeverity(opt.value)}
                        className={cn(
                          "h-7 rounded-lg px-3 text-xs font-medium transition-all",
                          severity === opt.value
                            ? "bg-muted text-foreground ring-1 ring-border"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={reset} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!title.trim() || saving}>
                  {saving ? "Adding…" : "Add to board"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
