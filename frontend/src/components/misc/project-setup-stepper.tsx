"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepStatus = "completed" | "current" | "upcoming";

export interface Step {
  id: string;
  title: string;
  description?: string;
  status: StepStatus;
}

interface ProjectSetupStepperProps {
  steps: Step[];
  onStepClick?: (step: Step) => void;
}

export function ProjectSetupStepper({
  steps,
  onStepClick,
}: ProjectSetupStepperProps) {
  return (
    <div className="w-full">
      <nav aria-label="Project setup progress">
        <ol className="space-y-1">
          {steps.map((step) => {
            const isCompleted = step.status === "completed";

            return (
              <li key={step.id}>
                <button
                  onClick={() => onStepClick?.(step)}
                  className={cn(
                    "flex w-full items-center gap-4 py-2 text-left transition-colors rounded-lg px-2 -mx-2",
                    onStepClick && "hover:bg-muted/50",
                  )}
                  disabled={!onStepClick}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border-2 transition-all flex-shrink-0",
                      isCompleted
                        ? "border-success bg-success text-success-foreground"
                        : "border-border bg-background",
                    )}
                  >
                    {isCompleted && (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    )}
                  </div>

                  {/* Step text */}
                  <span
                    className={cn(
                      "text-sm transition-colors",
                      isCompleted
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {step.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
