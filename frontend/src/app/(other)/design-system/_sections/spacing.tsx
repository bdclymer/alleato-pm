"use client";

const spacingScale = [
  { token: "gap-1", value: "4px", desc: "Icon-to-text gap" },
  { token: "gap-2", value: "8px", desc: "Tight groups" },
  { token: "gap-3", value: "12px", desc: "Compact lists" },
  { token: "gap-4", value: "16px", desc: "Default group spacing" },
  { token: "gap-6", value: "24px", desc: "Form fields, subsections" },
  { token: "gap-8", value: "32px", desc: "Top-level page sections" },
];

const radiusTokens = [
  { token: "rounded-md", desc: "Inputs, buttons" },
  { token: "rounded-lg", desc: "Cards, modals" },
  { token: "rounded-full", desc: "Avatars, pills" },
];

const shadowTokens = [
  { token: "shadow-xs", desc: "Form inputs, select triggers" },
  { token: "shadow-sm", desc: "Cards, dropdowns" },
];

export function SpacingSection() {
  return (
    <section id="spacing" className="scroll-mt-8">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Spacing, Radius & Shadows
      </h2>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        8px grid system. Every spacing value is a multiple of 8px (4px for tight
        situations).
      </p>

      {/* Spacing Scale */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Spacing Scale
        </h3>
        <div className="space-y-3 rounded-lg border border-border bg-card p-6">
          {spacingScale.map((s) => (
            <div key={s.token} className="flex items-center gap-4">
              <span className="w-16 shrink-0 text-xs font-mono text-muted-foreground">
                {s.token}
              </span>
              <span className="w-10 shrink-0 text-xs text-muted-foreground">
                {s.value}
              </span>
              <div className="flex items-center">
                <div
                  className="h-4 rounded bg-primary"
                  style={{ width: s.value }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Border Radius
        </h3>
        <div className="flex gap-8">
          {radiusTokens.map((r) => (
            <div key={r.token} className="space-y-2 text-center">
              <div
                className={`h-16 w-16 border border-border bg-muted ${r.token}`}
              />
              <p className="text-xs font-mono text-muted-foreground">
                {r.token}
              </p>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Shadows */}
      <div>
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Shadows
        </h3>
        <div className="flex gap-8">
          {shadowTokens.map((s) => (
            <div key={s.token} className="space-y-2 text-center">
              <div
                className={`h-16 w-24 rounded-lg border border-border bg-card ${s.token}`}
              />
              <p className="text-xs font-mono text-muted-foreground">
                {s.token}
              </p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
          <div className="space-y-2 text-center">
            <div className="h-16 w-24 rounded-lg border border-border bg-card" />
            <p className="text-xs font-mono text-muted-foreground">(none)</p>
            <p className="text-xs text-muted-foreground">Most elements</p>
          </div>
        </div>
      </div>
    </section>
  );
}
