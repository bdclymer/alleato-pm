"use client";

import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateMeeting } from "@/hooks/use-meetings";
import { Loader2, Plus } from "lucide-react";

interface CreateMeetingDialogProps {
  projectId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function CreateMeetingDialog({
  projectId,
  onSuccess,
  trigger,
}: CreateMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const createMeeting = useCreateMeeting(projectId);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    duration_minutes: "",
    category: "",
    description: "",
    participants: "",
    access_level: "private",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormData({
      title: "",
      date: "",
      duration_minutes: "",
      category: "",
      description: "",
      participants: "",
      access_level: "private",
    });
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createMeeting.mutateAsync({
        title: formData.title.trim(),
        date: formData.date || null,
        duration_minutes: formData.duration_minutes
          ? parseInt(formData.duration_minutes, 10)
          : null,
        category: formData.category || null,
        description: formData.description || null,
        participants: formData.participants || null,
        access_level: formData.access_level || "private",
      });
      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch {
      // Error is handled by the mutation's onError
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Meeting
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Meeting</DialogTitle>
            <DialogDescription>
              Add a new meeting record to this project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="create-title">Title *</Label>
              <Input
                id="create-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Meeting title"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            {/* Date */}
            <div className="grid gap-2">
              <Label htmlFor="create-date">Date</Label>
              <Input
                id="create-date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>

            {/* Duration */}
            <div className="grid gap-2">
              <Label htmlFor="create-duration">Duration (minutes)</Label>
              <Input
                id="create-duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, duration_minutes: e.target.value })
                }
                placeholder="60"
              />
            </div>

            {/* Category/Type */}
            <div className="grid gap-2">
              <Label htmlFor="create-category">Type</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger id="create-category">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OAC Meeting">OAC Meeting</SelectItem>
                  <SelectItem value="Subcontractor Meeting">Subcontractor Meeting</SelectItem>
                  <SelectItem value="Internal Meeting">Internal Meeting</SelectItem>
                  <SelectItem value="Safety Meeting">Safety Meeting</SelectItem>
                  <SelectItem value="Design Review">Design Review</SelectItem>
                  <SelectItem value="Progress Meeting">Progress Meeting</SelectItem>
                  <SelectItem value="Kickoff Meeting">Kickoff Meeting</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Participants */}
            <div className="grid gap-2">
              <Label htmlFor="create-participants">Participants</Label>
              <Input
                id="create-participants"
                value={formData.participants}
                onChange={(e) =>
                  setFormData({ ...formData, participants: e.target.value })
                }
                placeholder="Comma-separated names"
              />
            </div>

            {/* Access Level */}
            <div className="grid gap-2">
              <Label htmlFor="create-access">Access Level</Label>
              <Select
                value={formData.access_level}
                onValueChange={(value) =>
                  setFormData({ ...formData, access_level: value })
                }
              >
                <SelectTrigger id="create-access">
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Meeting description or notes"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMeeting.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMeeting.isPending}>
              {createMeeting.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Meeting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
