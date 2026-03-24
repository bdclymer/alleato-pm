"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ChevronUp } from "lucide-react";

const currentYear = new Date().getFullYear();

const adminLinks = [
  { label: "Admin", href: "/admin" },
  { label: "RAG Eval", href: "/rag-eval" },
  { label: "Redoc", href: "/redoc" },
  { label: "API Docs", href: "/api-docs" },
  { label: "Database", href: "/database" },
  { label: "Docs", href: "/docs" },
  { label: "Design System", href: "/design-system" },
  { label: "Procore Tools", href: "/procore-tools" },
  { label: "Procore Docs", href: "/procore-docs" },
  { label: "Feedback Inbox", href: "/feedback-inbox" },
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
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Admin
        <ChevronUp className={`h-3 w-3 transition-transform ${open ? "" : "rotate-180"}`} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 min-w-36 rounded-md border border-border bg-popover py-1 shadow-sm">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/30">
      <div className="flex flex-col items-center gap-3 px-4 py-6 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <AdminDropdown />
        </nav>
        <p className="text-xs text-muted-foreground">
          &copy; {currentYear} Alleato Group. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
