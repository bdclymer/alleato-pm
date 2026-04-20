/* eslint-disable design-system/no-raw-heading */
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Plus, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ToolLink {
  name: string;
  href: string;
  badge?: string;
  isFavorite?: boolean;
  hasCreateAction?: boolean;
}

const coreTools: ToolLink[] = [
  { name: "Dashboard", href: "/dashboard", badge: "New" },
  { name: "Directory", href: "/directory/clients" },
  { name: "Meetings", href: "/meetings" },
];

const projectManagementTools: ToolLink[] = [
  { name: "Schedule", href: "/schedule", hasCreateAction: true },
  { name: "Daily Logs", href: "/daily-logs" },
];

const financialManagementTools: ToolLink[] = [
  { name: "Commitments", href: "/commitments", hasCreateAction: true },
  { name: "Invoices", href: "/invoices" },
  { name: "Budget", href: "/budget", hasCreateAction: true },
];

export function DropdownTools() {
  const defaultTool = useMemo(() => coreTools[0]?.name ?? "Tools", []);
  const [currentTool, setCurrentTool] = useState(defaultTool);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 items-center gap-2 rounded px-2 text-foreground transition-colors hover:bg-muted"
        >
          <span className="text-xs text-muted-foreground">Project Tools</span>
          <span className="ml-2 text-sm font-medium">{currentTool}</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-screen rounded-none border-x-0 p-6"
      >
        <div className="container mx-auto">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
            <div>
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Core Tools
              </h3>
              <div className="space-y-1">
                {coreTools.map((tool) => (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    onClick={() => setCurrentTool(tool.name)}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <span>{tool.name}</span>
                    {tool.badge && (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        {tool.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Project Management
              </h3>
              <div className="space-y-1">
                {projectManagementTools.map((tool) => (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    onClick={() => setCurrentTool(tool.name)}
                    className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <span className="flex items-center gap-2">
                      {tool.isFavorite && (
                        <Star className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {tool.name}
                      {tool.hasCreateAction && (
                        <Plus className="ml-1 h-4 w-4 rounded-full bg-orange-500 p-0.5 text-white" />
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Financial Management
              </h3>
              <div className="space-y-1">
                {financialManagementTools.map((tool) => (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    onClick={() => setCurrentTool(tool.name)}
                    className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <span className="flex items-center gap-2">
                      {tool.name}
                      {tool.hasCreateAction && (
                        <Plus className="ml-1 h-4 w-4 rounded-full bg-orange-500 p-0.5 text-white" />
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default DropdownTools;
