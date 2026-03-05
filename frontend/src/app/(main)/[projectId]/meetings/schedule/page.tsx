"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { ProjectFormPageLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateMeeting } from "@/hooks/use-meetings";
import { Loader2 } from "lucide-react";

const MEETING_TYPES = [
  "OAC Meeting",
  "Subcontractor Meeting",
  "Internal Meeting",
  "Safety Meeting",
  "Design Review",
  "Progress Meeting",
  "Kickoff Meeting",
  "Other",
] as const;

export default function ScheduleMeetingPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const createMeeting = useCreateMeeting(projectId);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    duration_minutes: "",
    category: "",
    participants: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.date) {
      newErrors.date = "Date and time is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const result = await createMeeting.mutateAsync({
        title: formData.title.trim(),
        date: formData.date || null,
        duration_minutes: formData.duration_minutes
          ? parseInt(formData.duration_minutes, 10)
          : 60,
        category: formData.category || null,
        participants: formData.participants || null,
        description: formData.description || null,
        status: "scheduled",
      });

      toast.success("Meeting scheduled");
      router.push(`/${projectId}/meetings/${result.data.id}/prep`);
    } catch {
      // Error handled by mutation's onError
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <ProjectFormPageLayout
      title="Schedule Meeting"
      description="Schedule a future meeting and generate AI-powered meeting prep."
      onBack={() => router.push(`/${projectId}/meetings`)}
      backLabel="Back to Meetings"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="grid gap-2">
          <Label htmlFor="title">Meeting Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="e.g., Weekly OAC Meeting"
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title}</p>
          )}
        </div>

        {/* Date & Duration row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="date">Date & Time *</Label>
            <Input
              id="date"
              type="datetime-local"
              value={formData.date}
              onChange={(e) => updateField("date", e.target.value)}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => updateField("duration_minutes", e.target.value)}
              placeholder="60"
            />
          </div>
        </div>

        {/* Type */}
        <div className="grid gap-2">
          <Label htmlFor="category">Meeting Type</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => updateField("category", value)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {MEETING_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Participants */}
        <div className="grid gap-2">
          <Label htmlFor="participants">Attendees</Label>
          <Input
            id="participants"
            value={formData.participants}
            onChange={(e) => updateField("participants", e.target.value)}
            placeholder="Comma-separated names"
          />
          <p className="text-xs text-muted-foreground">
            Enter names separated by commas
          </p>
        </div>

        {/* Description */}
        <div className="grid gap-2">
          <Label htmlFor="description">Purpose / Notes</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="What is this meeting about?"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${projectId}/meetings`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMeeting.isPending}>
            {createMeeting.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Schedule & Prep
          </Button>
        </div>
      </form>
    </ProjectFormPageLayout>
  );
}
