"use client"

import * as React from "react"
import { CheckCircle2, Circle, ChevronRight, ExternalLink } from "lucide-react"
import Link from "next/link"
import {
  Slideover,
  SlideoverContent,
  SlideoverHeader,
  SlideoverTitle,
  SlideoverDescription,
  SlideoverBody,
  SlideoverTrigger,
} from "@/components/ui/unified-slideover"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useProjectChecklist } from "@/hooks/use-project-checklist"

interface ChecklistItem {
  id: string
  title: string
  description?: string
  category: string
  href: string
}

interface ProjectChecklistSidebarProps {
  projectId: string
  projectName?: string
  className?: string
}

const getChecklistItems = (projectId: string): ChecklistItem[] => [
  {
    id: "setup-team",
    title: "Set up project team",
    description: "Add team members and assign roles",
    category: "Setup",
    href: `/${projectId}/directory`,
  },
  {
    id: "configure-budget",
    title: "Configure budget",
    description: "Set up budget line items and allocations",
    category: "Setup",
    href: `/${projectId}/budget`,
  },
  {
    id: "add-contracts",
    title: "Add contracts",
    description: "Upload and manage project contracts",
    category: "Setup",
    href: `/${projectId}/commitments`,
  },
  {
    id: "create-schedule",
    title: "Create project schedule",
    description: "Set up timeline and milestones",
    category: "Planning",
    href: `/${projectId}/schedule`,
  },
  {
    id: "upload-drawings",
    title: "Upload drawings",
    description: "Add architectural and engineering drawings",
    category: "Documentation",
    href: `/${projectId}/drawings`,
  },
  {
    id: "setup-rfis",
    title: "Set up RFIs",
    description: "Configure RFI workflow and templates",
    category: "Documentation",
    href: `/${projectId}/rfis`,
  },
  {
    id: "setup-change-orders",
    title: "Set up change orders",
    description: "Configure change order tracking",
    category: "Financial",
    href: `/${projectId}/change-orders`,
  },
  {
    id: "setup-submittals",
    title: "Set up submittals",
    description: "Configure submittal workflow",
    category: "Documentation",
    href: `/${projectId}/submittals`,
  },
]

export function ProjectChecklistSidebar({
  projectId,
  projectName = "Project",
  className,
}: ProjectChecklistSidebarProps) {
  const [open, setOpen] = React.useState(false)
  const { data: checklistStatus, isLoading } = useProjectChecklist(projectId)

  const checklistItems = React.useMemo(
    () => getChecklistItems(projectId),
    [projectId]
  )

  const completedCount = React.useMemo(() => {
    if (!checklistStatus) return 0
    return Object.values(checklistStatus).filter(Boolean).length
  }, [checklistStatus])

  const totalCount = checklistItems.length
  const progressPercentage = (completedCount / totalCount) * 100

  // Group items by category
  const groupedItems = React.useMemo(() => {
    return checklistItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    }, {} as Record<string, ChecklistItem[]>)
  }, [checklistItems])

  return (
    <Slideover open={open} onOpenChange={setOpen}>
      <SlideoverTrigger asChild>
        <Button
          variant="outline"
          size="default"
          className={cn("shadow-sm", className)}
        >
          <span>Setup Checklist</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </SlideoverTrigger>
      <SlideoverContent side="right" size="md">
        <SlideoverHeader>
          <SlideoverTitle>{projectName} Setup Checklist</SlideoverTitle>
          <SlideoverDescription>
            Track your project setup progress
          </SlideoverDescription>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">
                {completedCount} of {totalCount} completed
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </SlideoverHeader>
        <SlideoverBody>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                Loading checklist...
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {category}
                  </h3>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const isCompleted = checklistStatus?.[item.id as keyof typeof checklistStatus] ?? false
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "group flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors",
                            "hover:bg-accent/50",
                            isCompleted && "opacity-60"
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                          ) : (
                            <Circle className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-primary" />
                          )}
                          <div className="flex-1 space-y-1">
                            <div
                              className={cn(
                                "text-sm font-medium leading-none flex items-center gap-2",
                                isCompleted && "line-through"
                              )}
                            >
                              <span>{item.title}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SlideoverBody>
      </SlideoverContent>
    </Slideover>
  )
}