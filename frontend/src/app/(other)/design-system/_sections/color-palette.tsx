"use client";

const bgTokens = [
  { name: "bg-background", label: "Background", desc: "Page background" },
  { name: "bg-card", label: "Card", desc: "Card surfaces" },
  { name: "bg-muted", label: "Muted", desc: "Subtle background" },
  { name: "bg-accent", label: "Accent", desc: "Interactive hover" },
  { name: "bg-popover", label: "Popover", desc: "Popover surfaces" },
  { name: "bg-primary", label: "Primary", desc: "Primary buttons" },
  { name: "bg-secondary", label: "Secondary", desc: "Secondary buttons" },
  { name: "bg-destructive", label: "Destructive", desc: "Danger actions" },
];

const textTokens = [
  { name: "text-foreground", label: "Foreground", desc: "Primary text" },
  { name: "text-muted-foreground", label: "Muted Foreground", desc: "Secondary text" },
  { name: "text-primary", label: "Primary", desc: "Links, active nav" },
  { name: "text-destructive", label: "Destructive", desc: "Error text" },
  { name: "text-card-foreground", label: "Card Foreground", desc: "Text on cards" },
];

const borderTokens = [
  { name: "border-border", label: "Border", desc: "Default borders" },
  { name: "border-input", label: "Input", desc: "Form input borders" },
  { name: "border-ring", label: "Ring", desc: "Focus ring color" },
];

const statusTokens = [
  { bg: "bg-green-50", text: "text-green-600", label: "Success" },
  { bg: "bg-yellow-50", text: "text-yellow-600", label: "Warning" },
  { bg: "bg-red-50", text: "text-red-600", label: "Error" },
  { bg: "bg-blue-50", text: "text-blue-600", label: "Info" },
];

export function ColorPaletteSection() {
  return (
    <section id="colors" className="scroll-mt-8">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Color Palette
      </h2>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        All colors use semantic tokens. No hex codes, no hardcoded grays.
      </p>

      {/* Backgrounds */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Backgrounds
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {bgTokens.map((t) => (
            <div key={t.name} className="space-y-2">
              <div
                className={`h-16 rounded-lg border border-border ${t.name}`}
              />
              <p className="text-xs font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {t.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Text Colors */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Text
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {textTokens.map((t) => (
            <div key={t.name} className="space-y-2">
              <div className="flex h-16 items-center justify-center rounded-lg border border-border bg-background">
                <span className={`text-lg font-semibold ${t.name}`}>Aa</span>
              </div>
              <p className="text-xs font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {t.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Borders */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Borders
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {borderTokens.map((t) => (
            <div key={t.name} className="space-y-2">
              <div
                className={`h-16 rounded-lg border-2 bg-background ${t.name}`}
              />
              <p className="text-xs font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {t.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Status Colors */}
      <div>
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Status Colors
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statusTokens.map((t) => (
            <div key={t.label} className="space-y-2">
              <div
                className={`flex h-16 items-center justify-center rounded-lg ${t.bg}`}
              >
                <span className={`text-sm font-semibold ${t.text}`}>
                  {t.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {t.bg} / {t.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
