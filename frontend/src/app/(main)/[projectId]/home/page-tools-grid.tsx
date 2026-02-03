"use client";

import * as React from "react";
import { use } from "react";
import { AppShell } from "@/components/layouts";
import {
  ProjectInfoCard,
  ProjectToolsGrid,
  RecentActivity,
  QuickActions,
} from "@/components/project-home";
import {
  recentActivity,
  defaultProjectInfo,
  quickActions,
  getToolsByCategory,
} from "@/config/project-home";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectHomePage({ params }: PageProps) {
  const { projectId } = use(params);

  const coreTools = getToolsByCategory("core");
  const projectManagementTools = getToolsByCategory("project-management");
  const financialTools = getToolsByCategory("financial-management");

  return (
    <AppShell
      companyName="Alleato Group"
      projectName={defaultProjectInfo.name}
      currentTool="Home"
      userInitials="BC"
    >
      <div className="flex flex-col min-h-[calc(100vh-48px)] bg-muted">
        {/* Page Header */}
        <div className="bg-background border-b border-border px-6 py-4">
          <h1 className="text-2xl font-semibold text-foreground">Project Home</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome to {defaultProjectInfo.name}
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Project Info & Tools */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Info */}
              <ProjectInfoCard project={defaultProjectInfo} />

              {/* Financial Management Tools */}
              <ProjectToolsGrid
                tools={financialTools}
                projectId={projectId}
                title="Financial Management"
              />

              {/* Project Management Tools */}
              <ProjectToolsGrid
                tools={projectManagementTools}
                projectId={projectId}
                title="Project Management"
              />

              {/* Core Tools */}
              <ProjectToolsGrid
                tools={coreTools}
                projectId={projectId}
                title="Core Tools"
              />
            </div>

            {/* Right Column - Activity & Quick Actions */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <QuickActions actions={quickActions} projectId={projectId} />

              {/* Recent Activity */}
              <RecentActivity
                activities={recentActivity}
                projectId={projectId}
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
