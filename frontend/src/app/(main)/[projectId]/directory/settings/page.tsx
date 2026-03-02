"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProjectRolesTab } from "@/components/directory/settings/ProjectRolesTab";
import { PermissionsTableTab } from "@/components/directory/settings/PermissionsTableTab";
import { DirectoryActivityPanel } from "@/components/directory/settings/DirectoryActivityPanel";

type SettingsTab = "roles" | "permissions" | "activity";

export default function ProjectDirectorySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("roles");

  const handleBack = () => {
    router.push(`/${projectId}/directory/users`);
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-foreground">
            Project Directory Settings
          </h1>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-background border-r border-border min-h-[calc(100vh-73px)]">
          <div className="p-4">
            {/* Back button */}
            <Button
              variant="default"
              className="w-full mb-6 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {/* Navigation tabs */}
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab("roles")}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  activeTab === "roles"
                    ? "text-orange-600 bg-orange-50"
                    : "text-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                Project Roles
              </button>
              <button
                onClick={() => setActiveTab("permissions")}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  activeTab === "permissions"
                    ? "text-orange-600 bg-orange-50"
                    : "text-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                Permissions Table
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  activeTab === "activity"
                    ? "text-orange-600 bg-orange-50"
                    : "text-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                Activity Log
              </button>
            </nav>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 p-6">
          {activeTab === "roles" && <ProjectRolesTab projectId={projectId} />}
          {activeTab === "permissions" && (
            <PermissionsTableTab projectId={projectId} />
          )}
          {activeTab === "activity" && (
            <DirectoryActivityPanel projectId={projectId} />
          )}
        </div>
      </div>
    </div>
  );
}
