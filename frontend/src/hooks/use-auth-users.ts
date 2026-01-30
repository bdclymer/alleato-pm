"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  company_name: string | null;
  last_login_at: string | null;
  created_at: string;
  person_id: string | null;
  membership_status: string | null;
  invite_status: string | null;
}

export function useAuthUsers(projectId: string) {
  const supabase = createClient();

  const query = useQuery({
    queryKey: ["auth-users", projectId],
    queryFn: async () => {
      const projectIdNum = Number.parseInt(projectId, 10);

      // Query users_auth table to get actual authenticated users
      // Join with people and their project memberships
      const { data, error } = await supabase
        .from("users_auth")
        .select(`
          *,
          person:people!users_auth_person_id_fkey (
            id,
            first_name,
            last_name,
            email,
            job_title,
            created_at,
            company:companies(name),
            project_directory_memberships(
              status,
              invite_status,
              project_id,
              permission_template:permission_templates(name)
            )
          )
        `);

      if (error) {
        console.error("[useAuthUsers] Supabase error:", error);
        throw error;
      }

      // Raw data fetched from users_auth

      // Transform the data for easier consumption
      // Filter users who are members of this specific project
      const transformedUsers: AuthUser[] = (data || [])
        .map((userAuth) => {
          // Find membership for this specific project
          const projectMembership = userAuth.person?.project_directory_memberships?.find(
            (membership) => membership.project_id === projectIdNum
          );

          return {
            id: userAuth.auth_user_id,
            email: userAuth.person?.email || "",
            first_name: userAuth.person?.first_name || null,
            last_name: userAuth.person?.last_name || null,
            job_title: userAuth.person?.job_title || null,
            company_name: userAuth.person?.company?.name || null,
            last_login_at: userAuth.last_login_at,
            created_at: userAuth.person?.created_at || "",
            person_id: userAuth.person_id,
            membership_status: projectMembership?.status || null,
            invite_status: projectMembership?.invite_status || null,
            has_project_membership: !!projectMembership,
          };
        })
        .filter((user) => {
          const included = user.has_project_membership;
          if (!included) {
            // Filtered out - no project membership
          }
          return included;
        })
        .map(({ has_project_membership, ...user }) => user); // Remove the helper field

      // Filtered users ready
      return transformedUsers;
    },
    enabled: !!projectId,
  });

  return {
    users: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}