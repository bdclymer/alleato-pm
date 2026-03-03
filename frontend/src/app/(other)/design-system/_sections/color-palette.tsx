"use client";

const surfaceLevels = [
  {
    label: "Canvas",
    token: "bg-background",
    desc: "Page background — cool gray, never pure white",
  },
  {
    label: "Panels",
    token: "bg-card",
    desc: "Sidebar, cards, modals — white = elevated",
  },
  {
    label: "Nested",
    token: "bg-muted",
    desc: "Backgrounds within panels — slightly recessed",
  },
  {
    label: "Active",
    token: "bg-accent",
    desc: "Hover states, selected rows, focused regions",
  },
];

const brandTokens = [
  {
    label: "Primary",
    token: "bg-primary",
    textToken: "text-primary-foreground",
    desc: "Brand actions, CTA buttons",
  },
  {
    label: "Secondary",
    token: "bg-secondary",
    textToken: "text-secondary-foreground",
    desc: "Supporting actions",
  },
  {
    label: "Destructive",
    token: "bg-destructive",
    textToken: "text-white",
    desc: "Danger, delete, errors",
  },
];

const textTokens = [
  { label: "Headings", token: "text-foreground", opacity: "88%" },
  { label: "Body", token: "text-muted-foreground", opacity: "55%" },
  { label: "Caption", token: "text-muted-foreground/60", opacity: "38%" },
  { label: "Placeholder", token: "text-muted-foreground/40", opacity: "22%" },
];

const statusTokens = [
  {
    label: "Success",
    dot: "bg-green-500",
    bg: "bg-green-50",
    text: "text-green-600",
    desc: "Active, approved, healthy",
  },
  {
    label: "Warning",
    dot: "bg-yellow-500",
    bg: "bg-yellow-50",
    text: "text-yellow-600",
    desc: "Pending, attention needed",
  },
  {
    label: "Error",
    dot: "bg-red-500",
    bg: "bg-red-50",
    text: "text-red-600",
    desc: "Failed, rejected, overdue",
  },
  {
    label: "Info",
    dot: "bg-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-600",
    desc: "Draft, informational",
  },
];

export function ColorPaletteSection() {
  return (
    <section id="colors" className="scroll-mt-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
        <span className="font-mono text-[11px] font-medium text-muted-foreground/40 w-6 shrink-0">
          01
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Color System
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            All colors use semantic tokens. No hex codes, no hardcoded grays.
            Elevation goes lighter — white panels float above a gray canvas.
          </p>
        </div>
      </div>

      {/* Surface Elevation Strip */}
      <div className="mb-10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Surface Elevation
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl overflow-hidden bg-border shadow-sm">
          {surfaceLevels.map((s) => (
            <div key={s.token} className={`${s.token} p-4`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground mb-1">
                {s.label}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/40 mb-2">
                {s.token}
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Colors */}
      <div className="mb-10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Brand & Action
        </h3>
        <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden bg-border shadow-sm">
          {brandTokens.map((b) => (
            <div key={b.token} className={`${b.token} p-4`}>
              <p
                className={`text-sm font-semibold ${b.textToken} mb-1`}
              >
                {b.label}
              </p>
              <p
                className={`text-[10px] font-mono ${b.textToken} opacity-70`}
              >
                {b.token}
              </p>
              <p
                className={`text-[11px] ${b.textToken} opacity-80 mt-2`}
              >
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Text Opacity Tiers */}
      <div className="mb-10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Text Opacity Tiers
        </h3>
        <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden bg-border shadow-sm">
          {textTokens.map((t) => (
            <div key={t.label} className="bg-card p-4">
              <p className={`text-lg font-semibold ${t.token} mb-1`}>Aa</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                {t.label}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/40 mt-1">
                {t.opacity} opacity
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Status Colors */}
      <div>
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Status Colors
        </h3>
        <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden bg-border shadow-sm">
          {statusTokens.map((s) => (
            <div key={s.label} className={`${s.bg} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                <span className={`text-sm font-semibold ${s.text}`}>
                  {s.label}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {s.desc}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/40 mt-2">
                {s.bg} / {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
