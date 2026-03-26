"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/contexts/project-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, FolderOpen } from "lucide-react";

interface ProjectGuardProps {
  children: React.ReactNode;
  message?: string;
  redirectTo?: string;
}

/**
 * Component that ensures a project is selected before rendering children.
 * If no project is selected, shows a message prompting the user to select a project.
 */
export function ProjectGuard({
  children,
  message = "Please select a project to view this page.",
  redirectTo = "/",
}: ProjectGuardProps) {
  const { selectedProject, isLoading, projectId } = useProject();
  const router = useRouter();

  // If we have a project (either from context or URL), render children
  if (selectedProject || projectId) {
    return <>{children}</>;
  }

  // While loading, show a loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  // No project selected - show selection prompt
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-xl">No Project Selected</CardTitle>
          <CardDescription className="text-base mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            You can select a project from the project dropdown in the header or
            return to the homepage to choose a project.
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push(redirectTo)}
            >
              <FolderOpen />
              Go to Projects
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Higher-order component that wraps a page component with project guard
 */
export function withProjectGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps?: Omit<ProjectGuardProps, "children">,
) {
  return function ProjectGuardedComponent(props: P) {
    return (
      <ProjectGuard {...guardProps}>
        <Component {...props} />
      </ProjectGuard>
    );
  };
}
