"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface PanelSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export function PanelSection({ title, icon, children }: PanelSectionProps) {
  const [show, setShow] = useState(true);

  return (
    <div className="mb-6">
      <button
        type="button"
        className="flex w-full items-center justify-between mb-3 text-left group"
        onClick={() => setShow(!show)}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {icon}
          <span>{title}</span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${show ? "" : "-rotate-90"}`}
        />
      </button>
      {show && children}
    </div>
  );
}
