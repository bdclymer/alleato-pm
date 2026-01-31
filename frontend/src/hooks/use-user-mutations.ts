"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  DirectoryService,
  type PersonCreateDTO,
  type PersonUpdateDTO,
} from "@/services/directoryService";
import { toast } from "sonner";

export function useAddUser(projectId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const directoryService = new DirectoryService(supabase);

  return useMutation({
    mutationFn: async (data: PersonCreateDTO & { send_invite?: boolean }) => {
      const { send_invite, ...personData } = data;
      const person = await directoryService.createPerson(projectId, {
        ...personData,
        person_type: "user",
      });

      let inviteSent = false;
      // Auto-send invite if user has an email and send_invite is not explicitly false
      if (person?.id && personData.email && send_invite !== false) {
        try {
          const response = await fetch(
            `/api/projects/${projectId}/directory/people/${person.id}/invite`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            },
          );

          if (response.ok) {
            inviteSent = true;
          } else {
            console.warn(
              `Failed to auto-send invite (HTTP ${response.status}), user can be invited manually`,
            );
          }
        } catch (error) {
          // Invite send failure is non-fatal - user is still created
          console.warn("Failed to auto-send invite, user can be invited manually", error);
        }
      }

      return { person, inviteSent };
    },
    onSuccess: ({ inviteSent }) => {
      queryClient.invalidateQueries({ queryKey: ["project-users", projectId] });
      if (inviteSent) {
        toast.success("User added and invitation sent");
      } else {
        toast.success("User added successfully");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to add user: ${error.message}`);
    },
  });
}

export function useUpdateUser(projectId: string, personId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const directoryService = new DirectoryService(supabase);

  return useMutation({
    mutationFn: async (data: PersonUpdateDTO) => {
      return directoryService.updatePerson(projectId, personId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-users", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["person", projectId, personId],
      });
      toast.success("User updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });
}

export function useRemoveUser(projectId: string, personId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const directoryService = new DirectoryService(supabase);

  return useMutation({
    mutationFn: async () => {
      return directoryService.deactivatePerson(projectId, personId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-users", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["person", projectId, personId],
      });
      toast.success("User removed from project");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove user: ${error.message}`);
    },
  });
}

export function useBulkAddUsers(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      users: PersonCreateDTO[];
      send_invites?: boolean;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/users/bulk-add`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to bulk add users");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-users", projectId] });
      toast.success(
        `${data.created_count} users added successfully. ${data.failed_count} failed.`,
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to bulk add users: ${error.message}`);
    },
  });
}

export function useAddContact(projectId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const directoryService = new DirectoryService(supabase);

  return useMutation({
    mutationFn: async (data: PersonCreateDTO) => {
      return directoryService.createPerson(projectId, {
        ...data,
        person_type: "contact",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-users", projectId] });
      queryClient.invalidateQueries({ queryKey: ["contacts", projectId] });
      toast.success("Contact added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add contact: ${error.message}`);
    },
  });
}

export function useResendInvite(projectId: string, personId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/people/${personId}/resend-invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to resend invite");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-users", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["person", projectId, personId],
      });
      toast.success("Invitation resent successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to resend invite: ${error.message}`);
    },
  });
}
