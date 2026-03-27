"use client";

const typeScale = [
  {
    spec: "11px / 700\n0.08em tracking\nuppercase",
    token: "text-muted-foreground",
    render: (
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Section Label / Eyebrow
      </span>
    ),
  },
  {
    spec: "24px / 600\n-0.03em tracking\nlh: 1.1",
    token: "text-foreground",
    render: (
      <span className="text-2xl font-semibold tracking-tight text-foreground leading-tight">
        Page Title or Hero Number
      </span>
    ),
  },
  {
    spec: "20px / 600\n-0.02em tracking\nlh: 1.2",
    token: "text-foreground",
    render: (
      <span className="text-xl font-semibold tracking-tight text-foreground">
        Section Heading
      </span>
    ),
  },
  {
    spec: "14px / 600\n0em tracking\nlh: 1.4",
    token: "text-foreground",
    render: (
      <span className="text-sm font-semibold text-foreground">
        Subsection / Component Title
      </span>
    ),
  },
  {
    spec: "14px / 400\n0em tracking\nlh: 1.6",
    token: "text-muted-foreground",
    render: (
      <span className="text-sm text-muted-foreground leading-relaxed">
        Body text. Secondary color keeps it recessive. Never competes with
        headings or values. This is the workhorse size for descriptions and
        paragraphs.
      </span>
    ),
  },
  {
    spec: "12px / 400\n0em tracking\nlh: 1.5",
    token: "text-muted-foreground",
    render: (
      <span className="text-xs text-muted-foreground">
        Caption text, timestamps, metadata — clearly tertiary, never competes
        with body copy.
      </span>
    ),
  },
];

export function TypographySection() {
  return (
    <section id="typography" className="scroll-mt-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
        <span className="font-mono text-[11px] font-medium text-muted-foreground/40 w-6 shrink-0">
          02
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Typography Hierarchy
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Six levels of type. font-bold is banned in body content. Headings
            use negative letter-spacing, body uses 0.
          </p>
        </div>
      </div>

      {/* Type Specimen */}
      <div className="rounded-xl bg-card p-8 shadow-sm">
        {typeScale.map((t) => (
          <div
            key={t.spec}
            className={`flex items-baseline gap-6 py-3 ${t !== typeScale[typeScale.length - 1] ? "border-b border-border" : ""}`}
          >
            <div className="w-36 shrink-0">
              <pre className="font-mono text-[10px] text-muted-foreground/40 leading-relaxed whitespace-pre-wrap">
                {t.spec}
              </pre>
            </div>
            <div className="min-w-0">{t.render}</div>
          </div>
        ))}
      </div>

      {/* Font Weights */}
      <div className="mt-10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Allowed Weights
        </h3>
        <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden bg-border shadow-sm">
          {[
            ["font-normal", "Normal (400)", "Body text, descriptions"],
            ["font-medium", "Medium (500)", "Table cells, nav items"],
            ["font-semibold", "Semibold (600)", "Headings, labels, values"],
          ].map(([cls, label, usage]) => (
            <div key={cls} className="bg-card p-5">
              <p
                className={`text-base ${cls} text-foreground mb-1`}
              >
                {label}
              </p>
              <p className="text-xs text-muted-foreground">{usage}</p>
              <p className="mt-2 text-[10px] font-mono text-muted-foreground/40">
                {cls}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
