"use client"

import * as React from "react"
import { CheckCircle2, Circle, ChevronRight } from "lucide-react"
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

interface ChecklistItem {
  id: string
  title: string
  description?: string
  completed: boolean
  category: string
}

interface ProjectChecklistSidebarProps {
  projectId: string
  projectName?: string
  className?: string
}

const INITIAL_CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "setup-team",
    title: "Set up project team",
    description: "Add team members and assign roles",
    completed: false,
    category: "Setup",
  },
  {
    id: "configure-budget",
    title: "Configure budget",
    description: "Set up budget line items and allocations",
    completed: false,
    category: "Setup",
  },
  {
    id: "add-contracts",
    title: "Add contracts",
    description: "Upload and manage project contracts",
    completed: false,
    category: "Setup",
  },
  {
    id: "create-schedule",
    title: "Create project schedule",
    description: "Set up timeline and milestones",
    completed: false,
    category: "Planning",
  },
  {
    id: "upload-drawings",
    title: "Upload drawings",
    description: "Add architectural and engineering drawings",
    completed: false,
    category: "Documentation",
  },
  {
    id: "configure-permissions",
    title: "Configure permissions",
    description: "Set up access control for team members",
    completed: false,
    category: "Security",
  },
  {
    id: "setup-notifications",
    title: "Set up notifications",
    description: "Configure alerts and email notifications",
    completed: false,
    category: "Settings",
  },
  {
    id: "review-compliance",
    title: "Review compliance requirements",
    description: "Ensure all regulatory requirements are met",
    completed: false,
    category: "Compliance",
  },
]

export function ProjectChecklistSidebar({
  projectId,
  projectName = "Project",
  className,
}: ProjectChecklistSidebarProps) {
  const [open, setOpen] = React.useState(false)
  const [checklist, setChecklist] = React.useState<ChecklistItem[]>(() => {
    // Load saved checklist from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`project-checklist-${projectId}`)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error("Failed to parse saved checklist:", e)
        }
      }
    }
    return INITIAL_CHECKLIST_ITEMS
  })

  // Save checklist to localStorage when it changes
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `project-checklist-${projectId}`,
        JSON.stringify(checklist)
      )
    }
  }, [checklist, projectId])

  const toggleItem = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    )
  }

  const completedCount = checklist.filter((item) => item.completed).length
  const totalCount = checklist.length
  const progressPercentage = (completedCount / totalCount) * 100

  // Group items by category
  const groupedItems = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, ChecklistItem[]>)

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
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {category}
                </h3>
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={cn(
                        "group flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors",
                        "hover:bg-accent/50",
                        item.completed && "opacity-60"
                      )}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                      ) : (
                        <Circle className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-primary" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div
                          className={cn(
                            "text-sm font-medium leading-none",
                            item.completed && "line-through"
                          )}
                        >
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SlideoverBody>
      </SlideoverContent>
    </Slideover>
  )
}