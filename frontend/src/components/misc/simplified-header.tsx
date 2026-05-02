"use client";

import { useState } from "react";
import {
  Search,
  MessageSquare,
  HelpCircle,
  Bell,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Tool categories for the dropdown
const coreTools = [
  { name: "Home", href: "/" },
  { name: "360 Reporting", href: "/reporting" },
  { name: "Documents", href: "/documents" },
  { name: "Directory", href: "/directory" },
  { name: "Admin", href: "/admin" },
  { name: "Connection Manager", href: "/connection-manager", badge: "New" },
];

const projectManagementTools = [
  { name: "Emails", href: "/emails" },
  { name: "Outlook Emails", href: "/outlook-emails" },
  { name: "RFIs", href: "/rfis", hasCreateAction: true },
  { name: "Submittals", href: "/submittals", hasCreateAction: true },
  { name: "Transmittals", href: "/transmittals" },
  { name: "Punch List", href: "/punch-list", hasCreateAction: true },
  { name: "Meetings", href: "/meetings" },
  { name: "Schedule", href: "/schedule" },
  { name: "Daily Log", href: "/daily-log" },
  { name: "Photos", href: "/photos", isFavorite: true },
  { name: "Drawings", href: "/drawings" },
  { name: "Specifications", href: "/specifications" },
];

const financialManagementTools = [
  { name: "Contracts", href: "/contracts" },
  { name: "Budget", href: "/budget" },
  { name: "Commitments", href: "/commitments" },
  { name: "Change Orders", href: "/change-orders" },
  { name: "Change Events", href: "/change-events", hasCreateAction: true },
  { name: "Direct Costs", href: "/direct-costs" },
  { name: "Invoicing", href: "/invoices" },
];

const allTools = [
  ...coreTools,
  ...projectManagementTools,
  ...financialManagementTools,
];

interface SimplifiedHeaderProps {
  projectName?: string;
  currentTool?: string;
  userAvatar?: string;
}

export function SimplifiedHeader({
  projectName = "Goodwill Bart",
  currentTool = "Contracts",
  userAvatar = "/favicon-light.png",
}: SimplifiedHeaderProps) {
  const [selectedProject, setSelectedProject] = useState(projectName);
  const [selectedTool, setSelectedTool] = useState(currentTool);

  return (
    <header className="h-14 bg-card text-card-foreground flex items-center justify-between px-6 border-b border-border">
      {/* Left: Logo */}
      <div className="flex items-center gap-8">
        <Link href="/" className="text-sm font-bold tracking-wider">
          ALLEATO
          <br />
          GROUP
        </Link>

        {/* Center-Left: Dropdowns */}
        <div className="flex items-center gap-4">
          {/* Project Dropdown */}
          <div>
            <label className="block text-2xs text-muted-foreground uppercase mb-0.5">
              Project
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-7 px-2 text-card-foreground hover:bg-muted flex items-center gap-2"
                >
                  <span className="text-sm">{selectedProject}</span>
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem
                  onClick={() => setSelectedProject("Goodwill Bart")}
                >
                  Goodwill Bart
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedProject("Alleato Finance")}
                >
                  Alleato Finance
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedProject("Alleato Marketing")}
                >
                  Alleato Marketing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View All Projects</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tools Dropdown */}
          <div>
            <label className="block text-2xs text-muted-foreground uppercase mb-0.5">
              Tools
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-7 px-2 text-card-foreground hover:bg-muted flex items-center gap-2"
                >
                  <span className="text-sm">{selectedTool}</span>
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {allTools.map((tool) => (
                  <DropdownMenuItem
                    key={tool.name}
                    onClick={() => setSelectedTool(tool.name)}
                    asChild
                  >
                    <Link
                      href={tool.href}
                      className="flex items-center justify-between"
                    >
                      <span>{tool.name}</span>
                      {"badge" in tool && tool.badge && (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          {tool.badge}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Right: Action Icons */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-card-foreground hover:bg-muted rounded-full"
        >
          <Search />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-card-foreground hover:bg-muted rounded-full"
        >
          <MessageSquare />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-card-foreground hover:bg-muted rounded-full"
        >
          <HelpCircle />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-card-foreground hover:bg-muted rounded-full"
        >
          <Bell />
        </Button>

        <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-gray-600 hover:ring-gray-500">
          <AvatarImage src={userAvatar} alt="User avatar" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
