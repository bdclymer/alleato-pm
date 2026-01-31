import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface ClientStatus {
  isClient: boolean;
  isLoading: boolean;
  error: Error | null;
  clientCompanyId?: number;
  role?: string;
}

export function useIsClient(): ClientStatus {
  const [status, setStatus] = useState<ClientStatus>({
    isClient: false,
    isLoading: true,
    error: null,
  });

  const params = useParams();
  const { user } = useAuth();
  const projectId = params?.projectId as string | undefined;

  useEffect(() => {
    async function checkClientStatus() {
      if (!user?.id || !projectId) {
        setStatus({
          isClient: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("project_users")
          .select("is_client, client_company_id, role")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();

        if (error) {
          // User might not be on this project at all
          if (error.code === "PGRST116") {
            setStatus({
              isClient: false,
              isLoading: false,
              error: null,
            });
          } else {
            setStatus({
              isClient: false,
              isLoading: false,
              error: error as Error,
            });
          }
          return;
        }

        setStatus({
          isClient: data?.is_client || false,
          isLoading: false,
          error: null,
          clientCompanyId: data?.client_company_id,
          role: data?.role,
        });
      } catch (err) {
        setStatus({
          isClient: false,
          isLoading: false,
          error: err as Error,
        });
      }
    }

    checkClientStatus();
  }, [user?.id, projectId]);

  return status;
}

/**
 * Hook to check if a specific user is a client for a specific project
 * Useful for admin views where you need to check other users' status
 */
export function useIsUserClient(userId?: string, projectId?: string): ClientStatus {
  const [status, setStatus] = useState<ClientStatus>({
    isClient: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function checkClientStatus() {
      if (!userId || !projectId) {
        setStatus({
          isClient: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("project_users")
          .select("is_client, client_company_id, role")
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .eq("is_active", true)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            setStatus({
              isClient: false,
              isLoading: false,
              error: null,
            });
          } else {
            setStatus({
              isClient: false,
              isLoading: false,
              error: error as Error,
            });
          }
          return;
        }

        setStatus({
          isClient: data?.is_client || false,
          isLoading: false,
          error: null,
          clientCompanyId: data?.client_company_id,
          role: data?.role,
        });
      } catch (err) {
        setStatus({
          isClient: false,
          isLoading: false,
          error: err as Error,
        });
      }
    }

    checkClientStatus();
  }, [userId, projectId]);

  return status;
}