"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
            <button
              type="button"
              className="px-4 py-1.5 text-xs font-medium bg-brand text-white hover:bg-brand-dark transition-colors duration-200 disabled:opacity-50"
              onClick={handleSave}
              disabled={isSaving}
            >
              Save
            </button>
            <button
              type="button"
              className="px-4 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors duration-200 disabled:opacity-50"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
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
          <button
            type="button"
            className="absolute top-0 right-0 inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-brand transition-colors duration-200 opacity-0 group-hover:opacity-100"
            onClick={handleEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
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
