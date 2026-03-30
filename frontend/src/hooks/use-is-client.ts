import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { User } from "@supabase/supabase-js";

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
  const projectId = params?.projectId as string | undefined;

  useEffect(() => {
    async function checkClientStatus() {
      if (!projectId) {
        setStatus({
          isClient: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        const supabase = createClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setStatus({
            isClient: false,
            isLoading: false,
            error: null,
          });
          return;
        }

        const { data, error } = await supabase
          .from("project_directory_memberships")
          .select("*")
          .eq("project_id", parseInt(projectId))
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
              error,
            });
          }
          return;
        }

        setStatus({
          isClient: (data as any)?.user_type === 'Client' || false,
          isLoading: false,
          error: null,
          clientCompanyId: (data as any)?.company_id,
          role: (data as any)?.permission_template_id,
        });
      } catch (err) {
        setStatus({
          isClient: false,
          isLoading: false,
          error: err instanceof Error ? err : new Error("an unexpected error occurred — please try again"),
        });
      }
    }

    checkClientStatus();
  }, [projectId]);

  return status;
}