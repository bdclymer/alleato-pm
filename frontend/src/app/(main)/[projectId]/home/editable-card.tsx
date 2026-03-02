"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";

interface EditableField {
  label: string;
  value: string;
  key: string;
}

interface EditableCardProps {
  title: string;
  fields: EditableField[];
  onSave: (updates: Record<string, string>) => Promise<void>;
}

export function EditableCard({ title, fields, onSave }: EditableCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    // Initialize edited values with current values
    const initialValues: Record<string, string> = {};
    fields.forEach((field) => {
      initialValues[field.key] = field.value;
    });
    setEditedValues(initialValues);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedValues({});
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedValues);
      setIsEditing(false);
      setEditedValues({});
    } catch (error) {
      console.error("Failed to save project details:", error);
      // Keep edit mode open on error - parent component handles toast notification
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground">
            {title}
          </CardTitle>
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleEdit}
            >
              <Pencil className="h-4 w-4 text-foreground" />
              <span className="sr-only">Edit {title}</span>
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Check className="h-4 w-4 text-success" />
                <span className="sr-only">Save changes</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 text-destructive" />
                <span className="sr-only">Cancel editing</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <span className="text-sm font-medium">{field.label}:</span>
            {isEditing ? (
              <Input
                value={editedValues[field.key] || ""}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="ml-1 mt-1 h-8 text-sm"
                disabled={isSaving}
              />
            ) : (
              <span className="text-sm text-foreground ml-1">{field.value}</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
