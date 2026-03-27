"use client";

import { Download, Pencil, Plus, Settings, Trash2 } from "lucide-react";

import { Button } from "@/components/ds";

export function ButtonsStatesSection() {
  return (
    <section id="buttons" className="scroll-mt-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
        <span className="font-mono text-[11px] font-medium text-muted-foreground/40 w-6 shrink-0">
          04
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Buttons & Interactive States
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Hover, focus, and click each button to see live states. Tab through
            to verify focus rings.
          </p>
        </div>
      </div>

      {/* Variants */}
      <div className="mb-6">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Variants
        </h3>
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-6 shadow-sm">
          <Button variant="default">
            <Plus />
            Default
          </Button>
          <Button variant="secondary">
            <Pencil />
            Secondary
          </Button>
          <Button variant="outline">
            <Download />
            Outline
          </Button>
          <Button variant="ghost">
            <Settings />
            Ghost
          </Button>
          <Button variant="destructive">
            <Trash2 className="h-4 w-4" />
            Destructive
          </Button>
          <Button variant="link">Link</Button>
        </div>
      </div>

      {/* Sizes */}
      <div className="mb-6">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Sizes
        </h3>
        <div className="flex flex-wrap items-end gap-6 rounded-xl bg-card p-6 shadow-sm">
          {(
            [
              ["xs", "Extra Small"],
              ["sm", "Small"],
              ["default", "Default"],
              ["lg", "Large"],
            ] as const
          ).map(([size, label]) => (
            <div key={size} className="text-center">
              <Button size={size}>{label}</Button>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 font-mono">
                {size}
              </p>
            </div>
          ))}
          <div className="text-center">
            <Button size="icon">
              <Plus />
            </Button>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 font-mono">
              icon
            </p>
          </div>
          <div className="text-center">
            <Button size="icon-sm">
              <Plus />
            </Button>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 font-mono">
              icon-sm
            </p>
          </div>
        </div>
      </div>

      {/* Disabled States */}
      <div>
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Disabled
        </h3>
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-6 shadow-sm">
          <Button disabled>Default</Button>
          <Button variant="secondary" disabled>Secondary</Button>
          <Button variant="outline" disabled>Outline</Button>
          <Button variant="ghost" disabled>Ghost</Button>
          <Button variant="destructive" disabled>Destructive</Button>
        </div>
      </div>
    </section>
  );
}
