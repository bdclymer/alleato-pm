"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Eyebrow } from "@/components/ds";
import {
  ProjectSetupStepper,
  type Step,
} from "@/components/misc/project-setup-stepper";
import { SourcesList, type Source } from "@/components/misc/sources-list";

interface ProjectStep {
  id: string;
  label: string;
  completed: boolean;
}

interface ProjectSidebarProps extends React.ComponentProps<typeof Sidebar> {
  projectSteps?: ProjectStep[];
  sources?: Source[];
}

// Map step IDs to their corresponding routes
const stepRoutes: Record<string, string> = {
  "prime-contract": "/prime-contracts",
  "cost-codes": "/budget/setup",
  budget: "/budget",
  schedule: "/schedule",
  "project-team": "/home", // Could be /team if that page exists
  sov: "/sov",
  commitments: "/commitments",
};

const defaultSteps: ProjectStep[] = [
  { id: "prime-contract", label: "Prime Contract", completed: false },
  { id: "cost-codes", label: "Cost Codes", completed: false },
  { id: "budget", label: "Budget", completed: false },
  { id: "schedule", label: "Schedule", completed: false },
  { id: "project-team", label: "Project Team", completed: false },
  { id: "sov", label: "SOV", completed: false },
  { id: "commitments", label: "Commitments", completed: false },
];

export function ProjectSidebar({
  projectSteps = defaultSteps,
  sources = [],
  ...props
}: ProjectSidebarProps) {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const hasPrimeContract = projectSteps.some(
    (step) => step.id === "prime-contract" && step.completed,
  );

  // Convert ProjectStep[] to Step[] for ProjectSetupStepper
  const convertedSteps: Step[] = projectSteps.map((step) => ({
    id: step.id,
    title: step.label,
    status: step.completed ? "completed" : "upcoming",
  }));

  // Find the first uncompleted step to mark as current
  const firstUncompletedIndex = convertedSteps.findIndex(
    (s) => s.status === "upcoming",
  );
  if (firstUncompletedIndex !== -1) {
    convertedSteps[firstUncompletedIndex].status = "current";
  }

  // Handle step click - navigate to the appropriate page
  const handleStepClick = (step: Step) => {
    const route =
      step.id === "prime-contract" && !hasPrimeContract
        ? "/prime-contracts/new"
        : stepRoutes[step.id];
    if (route && projectId) {
      router.push(`/${projectId}${route}`);
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="bg-background sticky top-0 hidden h-svh border-l lg:flex"
      {...props}
    >
      <SidebarContent className="px-4 pt-6">
        {/* Project Setup Heading */}
        <div>
          <Eyebrow>Project Setup</Eyebrow>
          <p className="text-xs text-muted-foreground mt-1">
            Complete these steps to get started
          </p>
        </div>

        <SidebarSeparator className="mx-0" />

        {/* Vertical Stepper */}
        <ProjectSetupStepper
          steps={convertedSteps}
          onStepClick={handleStepClick}
        />

        {/* Sources Section */}
        {sources.length > 0 && (
          <>
            <SidebarSeparator className="mx-0 my-6" />
            <SourcesList sources={sources} />
          </>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
