"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list text-primary/70 inline-flex w-fit items-center justify-center max-w-full overflow-x-auto scrollbar-hide rounded-lg p-[3px] group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-primary/10",
        line: "gap-4 md:gap-6 bg-transparent border-b border-border p-0 h-auto",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Default variant (shadcn-style pill tabs)
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-primary/70 inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=default]/tabs-list:h-[calc(100%-1px)] group-data-[variant=default]/tabs-list:flex-1 group-data-[variant=default]/tabs-list:rounded-md group-data-[variant=default]/tabs-list:border group-data-[variant=default]/tabs-list:border-transparent group-data-[variant=default]/tabs-list:px-2 group-data-[variant=default]/tabs-list:py-1",
        "group-data-[variant=default]/tabs-list:data-[state=active]:bg-background group-data-[variant=default]/tabs-list:data-[state=active]:text-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm",
        "group-data-[variant=default]/tabs-list:focus-visible:ring-[3px]",
        // Line variant — matches PageTabs exactly: border-b-2 underline, primary color, semibold
        "group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:border-b-transparent group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:px-1.5 group-data-[variant=line]/tabs-list:pb-3 group-data-[variant=line]/tabs-list:pt-3 group-data-[variant=line]/tabs-list:h-auto group-data-[variant=line]/tabs-list:flex-none",
        "group-data-[variant=line]/tabs-list:text-foreground/60 group-data-[variant=line]/tabs-list:hover:text-foreground",
        "group-data-[variant=line]/tabs-list:data-[state=active]:border-b-primary group-data-[variant=line]/tabs-list:data-[state=active]:text-primary group-data-[variant=line]/tabs-list:data-[state=active]:font-semibold group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none",
        "group-data-[variant=line]/tabs-list:after:hidden",
        // Vertical orientation
        "group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start focus-visible:ring-[3px] focus-visible:outline-1",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
