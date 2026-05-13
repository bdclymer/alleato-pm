import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBrowserUser } from "@/lib/supabase/current-user";
import { useParams } from "next/navigation";

interface ClientStatus {
  isClient: boolean;
  isLoading: boolean;
  error: Error | null;
  clientCompanyId?: string;
  role?: string;
}

export function useIsClient(): ClientStatus {
  const [status, setStatus] = useState<ClientStatus>({
    isClient: false,
    isLoading: true,
    error: null,
  });

  const params = useParams()!;
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
        const user = await getCurrentBrowserUser(supabase);

        if (!user) {
          setStatus({
            isClient: false,
            isLoading: false,
            error: null,
          });
          return;
        }

        const { data: person, error: personError } = await supabase
          .from("people")
          .select("id, company_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (personError) {
          setStatus({
            isClient: false,
            isLoading: false,
            error: personError,
          });
          return;
        }

        if (!person) {
          setStatus({
            isClient: false,
            isLoading: false,
            error: null,
          });
          return;
        }

        const { data: membership, error } = await supabase
          .from("project_directory_memberships")
          .select("user_type, permission_template_id")
          .eq("project_id", Number.parseInt(projectId, 10))
          .eq("person_id", person.id)
          .eq("status", "active")
          .maybeSingle();

        if (error) {
          setStatus({
            isClient: false,
            isLoading: false,
            error,
          });
          return;
        }

        setStatus({
          isClient: membership?.user_type === "Client",
          isLoading: false,
          error: null,
          clientCompanyId: person.company_id ?? undefined,
          role: membership?.permission_template_id ?? undefined,
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
