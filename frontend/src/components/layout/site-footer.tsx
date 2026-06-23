"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ChevronUp } from "lucide-react";

import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { Button } from "@/components/ui/button";

const currentYear = new Date().getFullYear();

const adminDropdownAllowedUserIds = new Set([
  "6ae4299f-6c21-4e99-b6a1-ccb1fe5aa7f6",
]);

const adminSections = [
  {
    label: "Admin",
    links: [
      { label: "Command Center", href: "/command-center" },
      { label: "Admin Dashboard", href: "/admin" },
      { label: "Feedback Inbox", href: "/feedback-inbox" },
      { label: "Annotation Inbox", href: "/annotation-inbox" },
      { label: "AI Learning", href: "/ai/learning-promotions" },
      { label: "Updates", href: "/updates" },
    ],
  },
  {
    label: "Design",
    links: [
      { label: "Design", href: "/design" },
      { label: "Style Guide", href: "/style-guide" },
      { label: "Design Violations", href: "/design-violations" },
    ],
  },
  {
    label: "Developer",
    links: [
      { label: "API Docs", href: "/api-docs" },
      { label: "Redoc", href: "/redoc" },
      { label: "Database", href: "/database-inventory" },
      { label: "RAG Eval", href: "/rag-eval" },
      { label: "Docs", href: "/docs" },
    ],
  },
  {
    label: "Procore",
    links: [
      { label: "Procore Tools", href: "/procore-tools" },
      { label: "Procore Docs", href: "/procore-docs" },
    ],
  },
];

function AdminDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="h-auto gap-1 p-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
      >
        Admin
        <ChevronUp className={`h-3 w-3 transition-transform ${open ? "" : "rotate-180"}`} />
      </Button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 rounded-md border border-border bg-popover p-5 shadow-sm">
          <div className="flex gap-8">
            {adminSections.map((section) => (
              <div key={section.label} className="shrink-0">
                {/* eslint-disable-next-line design-system/no-raw-heading */}
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {section.label}
                </h3>
                <div className="space-y-0.5">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SiteFooter() {
  const { profile } = useCurrentUserProfile();
  const canViewAdminDropdown =
    profile?.isAdmin === true && adminDropdownAllowedUserIds.has(profile.id);

  return (
    <footer className="mt-auto shrink-0">
      <div className="flex flex-col items-center gap-3 bg-transparent px-4 py-1 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {canViewAdminDropdown ? <AdminDropdown /> : null}
        </nav>
        <p className="text-xs text-muted-foreground">
          &copy; {currentYear} Alleato Group. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
