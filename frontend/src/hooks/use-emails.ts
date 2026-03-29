"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ProjectEmail {
  id: number;
  project_id: number;
  subject: string;
  body: string | null;
  body_html: string | null;
  from_name: string | null;
  from_email: string | null;
  to_list: string[] | null;
  cc_list: string[] | null;
  bcc_list: string[] | null;
  status: "Draft" | "Sent" | "Received" | "Failed";
  sent_at: string | null;
  received_at: string | null;
  is_private: boolean | null;
  is_starred: boolean | null;
  has_attachments: boolean | null;
  related_tool: string | null;
  related_id: string | null;
  distribution_group: string | null;
  thread_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export type CreateEmailInput = {
  subject: string;
  body?: string | null;
  body_html?: string | null;
  from_name?: string | null;
  from_email?: string | null;
  to_list?: string[] | null;
  cc_list?: string[] | null;
  bcc_list?: string[] | null;
  status?: "Draft" | "Sent" | "Received" | "Failed";
  is_private?: boolean;
  is_starred?: boolean;
  has_attachments?: boolean;
  related_tool?: string | null;
  related_id?: string | null;
  distribution_group?: string | null;
  thread_id?: string | null;
};

export type UpdateEmailInput = Partial<CreateEmailInput>;

export const emailKeys = {
  all: (projectId: number) => ["emails", projectId] as const,
  list: (projectId: number, status?: string) =>
    ["emails", projectId, "list", status] as const,
  detail: (projectId: number, id: string) =>
    ["emails", projectId, "detail", id] as const,
};

export function useEmails(projectId: number, status?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const queryString = params.toString();

  return useQuery<ProjectEmail[]>({
    queryKey: emailKeys.list(projectId, status),
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/emails${queryString ? `?${queryString}` : ""}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch emails");
      }
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function useEmail(projectId: number, emailId: string) {
  return useQuery<ProjectEmail>({
    queryKey: emailKeys.detail(projectId, emailId),
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/emails/${emailId}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch email");
      }
      return res.json();
    },
    enabled: !!projectId && !!emailId,
  });
}

export function useCreateEmail(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation<ProjectEmail, Error, CreateEmailInput>({
    mutationFn: async (input) => {
      const res = await fetch(`/api/projects/${projectId}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create email");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all(projectId) });
      toast.success("Email created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateEmail(projectId: number, emailId: string) {
  const queryClient = useQueryClient();

  return useMutation<ProjectEmail, Error, UpdateEmailInput>({
    mutationFn: async (input) => {
      const res = await fetch(
        `/api/projects/${projectId}/emails/${emailId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update email");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all(projectId) });
      queryClient.invalidateQueries({
        queryKey: emailKeys.detail(projectId, emailId),
      });
      toast.success("Email updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteEmail(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation<{ message: string; id: number }, Error, string>({
    mutationFn: async (emailId) => {
      const res = await fetch(
        `/api/projects/${projectId}/emails/${emailId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete email");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all(projectId) });
      toast.success("Email deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
