"use client";

import * as React from "react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { Database } from "@/types/database.types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Meeting = Database["public"]["Tables"]["document_metadata"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];

interface EditMeetingModalProps {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditMeetingModal({
  meeting,
  open,
  onOpenChange,
  onSuccess,
}: EditMeetingModalProps) {
  const [loading, setLoading] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectOptions, setProjectOptions] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    meeting?.project_id || null,
  );
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  const [formData, setFormData] = useState({
    title: meeting?.title || "",
    summary: meeting?.summary || "",
    status: meeting?.status || "",
    access_level: meeting?.access_level || "",
    date: meeting?.date ? meeting.date.split("T")[0] : "",
    duration_minutes: meeting?.duration_minutes || null,
    participants: meeting?.participants || "",
  });

  // Search projects as user types
  React.useEffect(() => {
    const searchProjects = async () => {
      if (projectSearch.length < 2) {
        setProjectOptions([]);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, client")
        .ilike("name", `%${projectSearch}%`)
        .order("name")
        .limit(10);

      if (error) {
        console.error("Failed to search projects:", error);
        toast.error("Failed to search projects");
        return;
      }
      if (data) {
        setProjectOptions(data as unknown as typeof projectOptions);
      }
    };

    const debounce = setTimeout(searchProjects, 300);
    return () => clearTimeout(debounce);
  }, [projectSearch]);

  // Get current project name for display
  React.useEffect(() => {
    const getCurrentProject = async () => {
      if (!selectedProjectId || !meeting) return;

      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select("name")
        .eq("id", selectedProjectId)
        .single();

      if (data) {
        setProjectSearch(data.name ?? '');
      }
    };

    getCurrentProject();
  }, [selectedProjectId, meeting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meeting) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("document_metadata")
        .update({
          title: formData.title,
          summary: formData.summary,
          status: formData.status || null,
          access_level: formData.access_level || null,
          date: formData.date || null,
          duration_minutes: formData.duration_minutes,
          participants: formData.participants,
          project_id: selectedProjectId,
        })
        .eq("id", meeting.id);

      if (error) throw error;

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update meeting:", error);
      toast.error("Failed to update meeting. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
            <DialogDescription>
              Update meeting information and settings
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Meeting title"
              />
            </div>

            {/* Project with Autocomplete */}
            <div className="grid gap-2">
              <Label htmlFor="project">Project</Label>
              <div className="relative">
                <Input
                  id="project"
                  value={projectSearch}
                  onChange={(e) => {
                    setProjectSearch(e.target.value);
                    setShowProjectDropdown(true);
                  }}
                  onFocus={() => setShowProjectDropdown(true)}
                  placeholder="Type to search projects..."
                  autoComplete="off"
                />
                {showProjectDropdown && projectOptions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border border-neutral-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {projectOptions.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none"
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setProjectSearch(project.name ?? '');
                          setShowProjectDropdown(false);
                        }}
                      >
                        <div className="font-medium text-neutral-900">
                          {project.name}
                        </div>
                        {project.client && (
                          <div className="text-xs text-neutral-500">
                            {project.client}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>

            {/* Duration */}
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_minutes || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_minutes: parseInt(e.target.value) || null,
                  })
                }
                placeholder="60"
              />
            </div>

            {/* Participants */}
            <div className="grid gap-2">
              <Label htmlFor="participants">Participants</Label>
              <Input
                id="participants"
                value={formData.participants}
                onChange={(e) =>
                  setFormData({ ...formData, participants: e.target.value })
                }
                placeholder="Comma-separated names"
              />
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Access Level */}
            <div className="grid gap-2">
              <Label htmlFor="access">Access Level</Label>
              <Select
                value={formData.access_level}
                onValueChange={(value) =>
                  setFormData({ ...formData, access_level: value })
                }
              >
                <SelectTrigger id="access">
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            <div className="grid gap-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={formData.summary}
                onChange={(e) =>
                  setFormData({ ...formData, summary: e.target.value })
                }
                placeholder="Meeting summary"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
