"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface EditableSummaryProps {
  summary: string;
  onSave: (summary: string) => Promise<void>;
}

export function EditableSummary({ summary, onSave }: EditableSummaryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState(summary);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setEditedSummary(summary);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedSummary(summary);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedSummary);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save project summary:", error);
      // Keep edit mode open on error - parent component handles toast notification
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {isEditing ? (
        <div>
          <div className="flex justify-end gap-2 mb-4">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
          <Textarea
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            className="min-h-[240px] text-sm border-neutral-300 focus:border-brand focus:ring-brand/20 font-light"
            disabled={isSaving}
          />
        </div>
      ) : (
        <div className="relative group">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-0 right-0 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors duration-200 opacity-0 group-hover:opacity-100 h-auto p-0"
            onClick={handleEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>
          <div className="text-sm pr-16">
            {summary
              .split("\n")
              .filter((paragraph) => paragraph.trim())
              .map((paragraph, index) => (
                <p
                  key={index}
                  className="text-neutral-800 text-sm mb-2 last:mb-0"
                >
                  {paragraph.trim()}
                </p>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
