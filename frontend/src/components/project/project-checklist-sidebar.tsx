"use client"

import * as React from "react"
import { CheckCircle2, Circle, ChevronRight, ExternalLink, ListChecks } from "lucide-react"
import Link from "next/link"
import {
  Slideover,
  SlideoverContent,
  SlideoverHeader,
  SlideoverTitle,
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
  href: string
}

interface ProjectChecklistSidebarProps {
  projectId: string
  projectName?: string
  className?: string
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  buttonSize?: React.ComponentProps<typeof Button>["size"]
  iconOnly?: boolean
  buttonLabel?: string
}

const getChecklistItems = (projectId: string): ChecklistItem[] => [
  {
    id: "configure-budget",
    title: "Configure budget",

    href: `/${projectId}/budget`,
  },
  {
    id: "create-prime-contract",
    title: "Create prime contract",

    href: `/${projectId}/prime-contracts`,
  },
  {
    id: "create-schedule",
    title: "Create project schedule",

    href: `/${projectId}/schedule`,
  },
  {
    id: "upload-drawings",
    title: "Upload drawings",

    href: `/${projectId}/drawings`,
  },
  {
    id: "upload-specifications",
    title: "Upload specifications",

    href: `/${projectId}/specifications`,
  },
  {
    id: "update-project-team",
    title: "Update project team",

    href: `/${projectId}/directory`,
  },
  {
    id: "add-commitments",
    title: "Add commitments",

    href: `/${projectId}/commitments`,
  },
]

export function ProjectChecklistSidebar({
  projectId,
  projectName = "Project",
  className,
  buttonVariant = "outline",
  buttonSize = "default",
  iconOnly = false,
  buttonLabel = "Setup Checklist",
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


  return (
    <Slideover open={open} onOpenChange={setOpen}>
      <SlideoverTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          className={cn(iconOnly ? "" : "shadow-sm", className)}
          title="Setup Checklist"
        >
          {iconOnly ? (
            <ListChecks />
          ) : (
            <>
              <span>{buttonLabel}</span>
              <ChevronRight />
            </>
          )}
        </Button>
      </SlideoverTrigger>
      <SlideoverContent side="right" size="md">
        <SlideoverHeader>
          <SlideoverTitle>{projectName} Setup Checklist</SlideoverTitle>
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
            <div className="space-y-1">
              {checklistItems.map((item) => {
                const isCompleted = checklistStatus?.[item.id as keyof typeof checklistStatus] ?? false
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                      "hover:bg-accent/50",
                      isCompleted && "opacity-60"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4.5 w-4.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                    ) : (
                      <Circle className="h-4.5 w-4.5 flex-shrink-0 text-muted-foreground group-hover:text-primary" />
                    )}
                    <div className="flex-1">
                      <div
                        className={cn(
                          "text-sm font-medium leading-none flex items-center gap-2",
                          isCompleted && "line-through"
                        )}
                      >
                        <span>{item.title}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </SlideoverBody>
      </SlideoverContent>
    </Slideover>
  )
}
