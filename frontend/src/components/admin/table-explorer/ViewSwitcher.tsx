"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Table2, GalleryHorizontalEnd } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ViewType } from "@/lib/table-registry";

interface ViewSwitcherProps {
  currentView: ViewType;
  enabledViews: ViewType[];
}

const VIEW_ICONS = {
  table: Table2,
  list: List,
  grid: LayoutGrid,
  gallery: GalleryHorizontalEnd,
} as const;

const VIEW_LABELS = {
  table: "Table",
  list: "List",
  grid: "Grid",
  gallery: "Gallery",
} as const;

export function ViewSwitcher({ currentView, enabledViews }: ViewSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleViewChange = useCallback(
    (view: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (view === "table") {
        params.delete("view");
      } else {
        params.set("view", view);
      }

      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  if (enabledViews.length <= 1) {
    return null;
  }

  return (
    <Tabs
      value={currentView}
      onValueChange={handleViewChange}
      className="w-auto"
    >
      <TabsList>
        {enabledViews.map((view) => {
          const Icon = VIEW_ICONS[view];
          return (
            <TabsTrigger
              key={view}
              value={view}
              disabled={isPending}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{VIEW_LABELS[view]}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
