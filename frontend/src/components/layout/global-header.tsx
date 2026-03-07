"use client";

import * as React from "react";
import {
  Search,
  HelpCircle,
  MessageSquare,
  Bell,
  ChevronDown,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useHeader } from "./header-context";
import Image from "next/image";

export function GlobalHeader() {
  const { header } = useHeader();
  const {
    companyName = "Alleato Group",
    projectName = "24-104 - Goodwill Bart",
    currentTool = "Budget",
    userInitials = "BC",
  } = header;

  return (
    <header className="h-12 bg-[hsl(var(--procore-header))] text-[hsl(var(--procore-header-text))] flex items-center px-4 justify-between border-b border-white/5">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-[hsl(var(--procore-header-text))] hover:bg-background/10" />
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 flex items-center justify-center">
              <Image
                src="/favicon-light.png"
                alt="Alleato"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
            <span className="font-semibold text-sm hidden sm:inline">
              ALLEATO
            </span>
          </div>

          {/* Company/Project Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 text-[hsl(var(--procore-header-text))] hover:bg-background/10 px-2"
              >
                <span className="text-xs text-gray-300">{companyName}</span>
                <span className="mx-1 text-muted-foreground">|</span>
                <span className="text-sm font-medium">{projectName}</span>
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem>Switch Project</DropdownMenuItem>
              <DropdownMenuItem>Switch Company</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View All Projects</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Project Tools Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 text-[hsl(var(--procore-header-text))] hover:bg-background/10 px-2"
              >
                <span className="text-xs text-muted-foreground">Project Tools</span>
                <span className="ml-2 text-sm font-medium">{currentTool}</span>
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem>Home</DropdownMenuItem>
              <DropdownMenuItem>Directory</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="font-semibold">
                Budget
              </DropdownMenuItem>
              <DropdownMenuItem>Commitments</DropdownMenuItem>
              <DropdownMenuItem>Prime Contracts</DropdownMenuItem>
              <DropdownMenuItem>Invoicing</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>RFIs</DropdownMenuItem>
              <DropdownMenuItem>Submittals</DropdownMenuItem>
              <DropdownMenuItem>Daily Log</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search"
            className="w-full h-8 pl-9 pr-16 bg-background/10 border-0 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white/30"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
            <Command className="h-3 w-3" />
            <span className="text-xs">K</span>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1">
        {/* Icon Buttons */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[hsl(var(--procore-header-text))] hover:bg-background/10"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[hsl(var(--procore-header-text))] hover:bg-background/10"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[hsl(var(--procore-header-text))] hover:bg-background/10"
        >
          <Bell className="h-4 w-4" />
        </Button>

        {/* User Avatar */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-primary hover:bg-primary/90 rounded-full ml-2"
        >
          <span className="text-xs font-semibold text-primary-foreground">
            {userInitials}
          </span>
        </Button>
      </div>
    </header>
  );
}
