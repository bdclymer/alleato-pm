"use client";

import type * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Puzzle, SlidersHorizontal, UserCircle, Users } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Personal",
    items: [
      { label: "Profile", href: "/settings/profile", icon: UserCircle },
      { label: "Preferences", href: "/settings/preferences", icon: SlidersHorizontal },
    ],
  },
  {
    title: "Workspace",
    items: [
      { label: "Account", href: "/settings/account", icon: Building2 },
      { label: "Members", href: "/settings/members", icon: Users },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 min-h-0 h-full">
      {/* Left nav */}
      <aside className="w-56 shrink-0 border-r border-border bg-background flex flex-col">
        <ScrollArea className="flex-1">
          <nav className="px-3 py-4 space-y-5">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-1 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                          isActive
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground/60"
                          )}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 overflow-auto [&>*]:mx-auto">
        {children}
      </div>
    </div>
  );
}
