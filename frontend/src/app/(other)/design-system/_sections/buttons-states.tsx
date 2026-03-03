"use client";

import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Download, Settings } from "lucide-react";

export function ButtonsStatesSection() {
  return (
    <section id="buttons" className="scroll-mt-8">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Buttons & Interactive States
      </h2>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        All buttons use the shadcn Button component. Every button has hover,
        focus-visible, active, and disabled states built in. Try hovering,
        clicking, and tabbing.
      </p>

      {/* Variants */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Variants
        </h3>
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="default">
              <Plus className="h-4 w-4" />
              Default (Primary)
            </Button>
            <Button variant="secondary">
              <Pencil className="h-4 w-4" />
              Secondary
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4" />
              Outline
            </Button>
            <Button variant="ghost">
              <Settings className="h-4 w-4" />
              Ghost
            </Button>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4" />
              Destructive
            </Button>
            <Button variant="link">Link</Button>
          </div>
        </div>
      </div>

      {/* Sizes */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Sizes
        </h3>
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1 text-center">
              <Button size="xs">Extra Small</Button>
              <p className="text-xs text-muted-foreground font-mono">xs</p>
            </div>
            <div className="space-y-1 text-center">
              <Button size="sm">Small</Button>
              <p className="text-xs text-muted-foreground font-mono">sm</p>
            </div>
            <div className="space-y-1 text-center">
              <Button size="default">Default</Button>
              <p className="text-xs text-muted-foreground font-mono">default</p>
            </div>
            <div className="space-y-1 text-center">
              <Button size="lg">Large</Button>
              <p className="text-xs text-muted-foreground font-mono">lg</p>
            </div>
            <div className="space-y-1 text-center">
              <Button size="icon">
                <Plus className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground font-mono">icon</p>
            </div>
            <div className="space-y-1 text-center">
              <Button size="icon-sm">
                <Plus className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground font-mono">icon-sm</p>
            </div>
          </div>
        </div>
      </div>

      {/* Disabled States */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Disabled States
        </h3>
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-6">
          <Button disabled>Default Disabled</Button>
          <Button variant="secondary" disabled>
            Secondary Disabled
          </Button>
          <Button variant="outline" disabled>
            Outline Disabled
          </Button>
          <Button variant="ghost" disabled>
            Ghost Disabled
          </Button>
          <Button variant="destructive" disabled>
            Destructive Disabled
          </Button>
        </div>
      </div>

      {/* Interactive States Guide */}
      <div>
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          5-State System
        </h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  State
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Behavior
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Key Classes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">
                  Default
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Resting state
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  border-input shadow-xs
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">
                  Hover
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Background shifts
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  hover:bg-primary/90
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">
                  Focus
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Ring appears
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  focus-visible:ring-[3px] ring-ring/50
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">
                  Active
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Scale-down feedback
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  active:scale-[0.98]
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">
                  Disabled
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Faded, no interaction
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  disabled:opacity-50
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
