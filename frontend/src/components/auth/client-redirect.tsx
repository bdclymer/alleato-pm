"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useIsClient } from "@/hooks/use-is-client";
import { useParams } from "next/navigation";

/**
 * Component that redirects client users to the client dashboard
 * if they try to access restricted areas
 */
export function ClientRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname()!;
  const params = useParams()!;
  const { isClient, isLoading } = useIsClient();
  const projectId = params?.projectId as string | undefined;

  useEffect(() => {
    if (isLoading) return;

    // If user is a client and not on the client dashboard or allowed pages
    if (isClient && projectId && pathname) {
      const allowedClientPaths = [
        `/${projectId}/client-dashboard`,
        `/${projectId}/documents`,
        `/${projectId}/photos`,
        `/${projectId}/meetings`,
        "/profile",
        "/settings",
      ];

      const isAllowedPath = allowedClientPaths.some(path => pathname.startsWith(path));

      if (!isAllowedPath) {
        // Redirect to client dashboard
        router.replace(`/${projectId}/client-dashboard`);
      }
    }
  }, [isClient, isLoading, pathname, projectId, router]);

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to automatically redirect to client dashboard on project selection
 */
export function useClientAutoRedirect() {
  const router = useRouter();
  const { isClient, isLoading } = useIsClient();
  const params = useParams()!;
  const projectId = params?.projectId as string | undefined;

  useEffect(() => {
    if (isLoading || !projectId) return;

    // If user is a client, redirect to client dashboard
    if (isClient) {
      router.push(`/${projectId}/client-dashboard`);
    }
  }, [isClient, isLoading, projectId, router]);

  return { isClient, isLoading };
}