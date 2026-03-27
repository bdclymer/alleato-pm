"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, Folder, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DrawingAreaCard } from "./DrawingAreaCard";
import type { DrawingAreaWithCount } from "@/types/drawings.types";

interface DrawingAreaSelectorProps {
  areas: DrawingAreaWithCount[];
  selectedAreaId?: string;
  onSelectArea: (areaId: string | null) => void;
  onCreateArea?: (parentId?: string) => void;
  onEditArea?: (area: DrawingAreaWithCount) => void;
  onDeleteArea?: (area: DrawingAreaWithCount) => void;
  isLoading?: boolean;
  className?: string;
}

const depthPaddingClasses = ["pl-0", "pl-4", "pl-8", "pl-12", "pl-16"];

export function DrawingAreaSelector({
  areas,
  selectedAreaId,
  onSelectArea,
  onCreateArea,
  onEditArea,
  onDeleteArea,
  isLoading = false,
  className,
}: DrawingAreaSelectorProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Build hierarchical structure
  const buildHierarchy = (areas: DrawingAreaWithCount[]): DrawingAreaWithCount[] => {
    const areaMap = new Map<string, DrawingAreaWithCount>();
    const rootAreas: DrawingAreaWithCount[] = [];

    // First pass: create map and initialize children arrays
    areas.forEach(area => {
      areaMap.set(area.id, { ...area, children: [] });
    });

    // Second pass: build hierarchy
    areas.forEach(area => {
      const areaWithChildren = areaMap.get(area.id)!;
      if (area.parent_area_id) {
        const parent = areaMap.get(area.parent_area_id);
        if (parent) {
          parent.children!.push(areaWithChildren);
        }
      } else {
        rootAreas.push(areaWithChildren);
      }
    });

    return rootAreas;
  };

  const hierarchicalAreas = buildHierarchy(areas);

  const toggleExpanded = (areaId: string) => {
    setExpanded(prev => ({ ...prev, [areaId]: !prev[areaId] }));
  };

  const renderArea = (area: DrawingAreaWithCount, depth = 0): React.ReactNode => {
    const isExpanded = expanded[area.id];
    const hasChildren = area.children && area.children.length > 0;
    const isSelected = selectedAreaId === area.id;
    const paddingClass = depthPaddingClasses[Math.min(depth, depthPaddingClasses.length - 1)];

    return (
      <div key={area.id} className="w-full">
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors group",
            paddingClass,
            isSelected && "bg-blue-50 border border-blue-200"
          )}
          onClick={() => onSelectArea(area.id)}
        >
          {/* Expand/collapse button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                toggleExpanded(area.id);
              }
            }}
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown />
              ) : (
                <ChevronRight />
              )
            ) : (
              <div className="h-3 w-3" />
            )}
          </Button>

          {/* Folder icon */}
          <div className="flex-shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-blue-600" />
              ) : (
                <Folder className="h-4 w-4 text-blue-600" />
              )
            ) : (
              <Folder className="h-4 w-4 text-gray-500" />
            )}
          </div>

          {/* Area name and count */}
          <div className="flex-1 min-w-0">
            <span className={cn(
              "text-sm font-medium truncate",
              isSelected ? "text-blue-900" : "text-gray-900"
            )}>
              {area.name}
            </span>
          </div>

          {/* Drawing count badge */}
          <Badge variant="secondary" className="ml-2">
            {area.drawing_count}
          </Badge>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                <Plus />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onCreateArea && (
                <DropdownMenuItem onClick={() => onCreateArea(area.id)}>
                  <Plus className="h-3 w-3 mr-2" />
                  Add Sub-Area
                </DropdownMenuItem>
              )}
              {onEditArea && (
                <DropdownMenuItem onClick={() => onEditArea(area)}>
                  <Edit2 className="h-3 w-3 mr-2" />
                  Edit Area
                </DropdownMenuItem>
              )}
              {onDeleteArea && area.drawing_count === 0 && (
                <DropdownMenuItem
                  onClick={() => onDeleteArea(area)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete Area
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="mt-1">
            {area.children!.map(child => renderArea(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <SectionCard 
        title="Drawing Areas" 
        className={className}
        hideCollapse
      >
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2 p-2">
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="ml-auto h-4 w-6 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Drawing Areas"
      className={className}
      onAdd={onCreateArea ? () => onCreateArea() : undefined}
      addLabel="Add Area"
    >
      {hierarchicalAreas.length === 0 ? (
        <SectionCard.Empty
          message="No drawing areas created"
          description="Create areas to organize your drawings"
          actionLabel="Create First Area"
          onAction={onCreateArea}
        />
      ) : (
        <div className="space-y-1">
          {/* All drawings option */}
          <div
            className={cn(
              "flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors",
              !selectedAreaId && "bg-blue-50 border border-blue-200"
            )}
            onClick={() => onSelectArea(null)}
          >
            <div className="h-6 w-6" />
            <Folder className="h-4 w-4 text-gray-500" />
            <span className={cn(
              "text-sm font-medium",
              !selectedAreaId ? "text-blue-900" : "text-gray-900"
            )}>
              All Drawings
            </span>
            <Badge variant="secondary" className="ml-auto">
              {areas.reduce((sum, area) => sum + (area.drawing_count || 0), 0)}
            </Badge>
          </div>

          {/* Hierarchical areas */}
          {hierarchicalAreas.map(area => renderArea(area))}
        </div>
      )}
    </SectionCard>
  );
}
