"use client";

const spacingScale = [
  { token: "4px", tw: "gap-1 / p-1", desc: "Icon-to-label, badge padding, micro gaps" },
  { token: "8px", tw: "gap-2 / p-2", desc: "Tight inline spacing, icon margins" },
  { token: "12px", tw: "gap-3 / p-3", desc: "Compact lists, form label gaps" },
  { token: "16px", tw: "gap-4 / p-4", desc: "Default group spacing, card padding" },
  { token: "24px", tw: "gap-6 / p-6", desc: "Form fields, subsections" },
  { token: "32px", tw: "gap-8 / p-8", desc: "Top-level page sections" },
  { token: "48px", tw: "gap-12 / p-12", desc: "Major section breaks, page margins" },
];

const shadows = [
  {
    token: "shadow-xs",
    value: "0 1px 2px rgba(0,0,0,.05)",
    desc: "Subtle inputs, inline elements",
  },
  {
    token: "shadow-sm",
    value: "0 1px 2px rgba(0,0,0,.06)\n0 1px 3px rgba(0,0,0,.04)",
    desc: "Default for all white panels, cards, inputs, nav items",
  },
];

export function SpacingSection() {
  return (
    <section id="spacing" className="scroll-mt-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
        <span className="font-mono text-[11px] font-medium text-muted-foreground/40 w-6 shrink-0">
          03
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Spacing, Radius & Shadows
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Every value is a multiple of 4. Prefer multiples of 8. Shadows are
            structural in light mode — not decorative.
          </p>
        </div>
      </div>

      {/* Spacing Ruler */}
      <div className="mb-10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Spacing Scale
        </h3>
        <div className="rounded-xl bg-card p-6 shadow-sm">
          {spacingScale.map((s, i) => (
            <div
              key={s.token}
              className={`flex items-center gap-4 py-2.5 ${i < spacingScale.length - 1 ? "border-b border-border" : ""}`}
            >
              <span className="w-12 shrink-0 text-right font-mono text-[11px] font-medium text-muted-foreground">
                {s.token}
              </span>
              <div
                className="h-2 rounded bg-primary/60"
                style={{ width: s.token }}
              />
              <span className="text-xs text-muted-foreground">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div className="mb-10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Border Radius
        </h3>
        <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden bg-border shadow-sm">
          {[
            ["rounded-md", "6px", "Inputs, buttons, badges"],
            ["rounded-lg", "8px", "Cards, modals, panels"],
            ["rounded-full", "9999px", "Avatars, pills, dots"],
          ].map(([token, value, usage]) => (
            <div key={token} className="bg-card p-4 flex items-center gap-4">
              <div
                className={`h-14 w-14 shrink-0 border border-border bg-muted ${token}`}
              />
              <div>
                <p className="text-sm font-medium text-foreground">{token}</p>
                <p className="text-[10px] font-mono text-muted-foreground/40">
                  {value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{usage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shadow System */}
      <div>
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Shadow System
        </h3>
        <div className="rounded-xl border border-border bg-muted/30 p-6">
          <div className="grid grid-cols-2 gap-4">
            {shadows.map((s) => (
              <div key={s.token} className="text-center">
                <div
                  className={`h-24 rounded-lg bg-card ${s.token} mb-3`}
                />
                <p className="text-sm font-medium text-foreground">
                  {s.token}
                </p>
                <pre className="mt-1 text-[10px] font-mono text-muted-foreground/40 leading-relaxed whitespace-pre-wrap">
                  {s.value}
                </pre>
                <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Callout */}
        <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 border-l-[3px] border-l-primary p-4">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">The rule:</strong> In light
            mode, shadows are structural, not decorative. A white card with no
            shadow reads as flat. Add{" "}
            <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
              shadow-sm
            </code>{" "}
            at minimum to all white surface components. Only{" "}
            <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
              shadow-xs
            </code>{" "}
            and{" "}
            <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
              shadow-sm
            </code>{" "}
            are permitted — no shadow-sm, shadow-sm, or shadow-sm.
          </p>
        </div>
      </div>
    </section>
  );
}
