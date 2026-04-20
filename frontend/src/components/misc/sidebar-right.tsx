import * as React from "react";
import { CheckCircle2, Circle } from "lucide-react";

import { Eyebrow } from "@/components/ds";
import { NavUser } from "@/components/nav/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface ProjectStep {
  id: string;
  label: string;
  completed: boolean;
}

interface SidebarRightProps extends React.ComponentProps<typeof Sidebar> {
  projectSteps?: ProjectStep[];
}

const defaultSteps: ProjectStep[] = [
  { id: "prime-contract", label: "Prime Contract", completed: false },
  { id: "cost-codes", label: "Cost Codes", completed: false },
  { id: "budget", label: "Budget", completed: false },
  { id: "schedule", label: "Schedule", completed: false },
  { id: "project-team", label: "Project Team", completed: false },
  { id: "sov", label: "SOV", completed: false },
  { id: "commitments", label: "Commitments", completed: false },
];

export function SidebarRight({
  projectSteps = defaultSteps,
  ...props
}: SidebarRightProps) {
  return (
    <Sidebar
      collapsible="none"
      className="sticky top-0 hidden h-svh border-l lg:flex"
      {...props}
    >
      <SidebarHeader className="border-sidebar-border h-16 border-b">
        <NavUser />
      </SidebarHeader>
      <SidebarContent className="px-4 py-6">
        {/* Project Setup Heading */}
        <div className="mb-6">
          <Eyebrow>Project Setup</Eyebrow>
          <p className="text-xs text-muted-foreground mt-1">
            Complete these steps to get started
          </p>
        </div>

        <SidebarSeparator className="mx-0 mb-6" />

        {/* Vertical Stepper */}
        <div className="space-y-1">
          {projectSteps.map((step, index) => {
            const isLast = index === projectSteps.length - 1;

            return (
              <div key={step.id} className="relative">
                {/* Step Item */}
                <div className="flex items-center gap-4 py-2 group cursor-pointer hover:bg-accent/50 rounded-md px-2 transition-colors">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {step.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      step.completed
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute left-[18px] top-[36px] w-[2px] h-[28px]",
                      step.completed ? "bg-green-600/30" : "bg-border",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Summary */}
        <SidebarSeparator className="mx-0 my-6" />

        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Progress
            </span>
            <span className="text-xs font-semibold text-foreground">
              {projectSteps.filter((s) => s.completed).length} /{" "}
              {projectSteps.length}
            </span>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(projectSteps.filter((s) => s.completed).length / projectSteps.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
