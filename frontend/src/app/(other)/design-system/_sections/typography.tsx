"use client";

const fontSizes = [
  { token: "text-xs", size: "12px", usage: "Metadata, timestamps" },
  { token: "text-sm", size: "14px", usage: "Secondary text, table cells" },
  { token: "text-base", size: "16px", usage: "Body text, form inputs" },
  { token: "text-lg", size: "18px", usage: "Section headings (h2)" },
  { token: "text-xl", size: "20px", usage: "Page sub-headings" },
  { token: "text-2xl", size: "24px", usage: "Page titles" },
];

const fontWeights = [
  { token: "font-normal", label: "Normal (400)" },
  { token: "font-medium", label: "Medium (500)" },
  { token: "font-semibold", label: "Semibold (600)" },
];

export function TypographySection() {
  return (
    <section id="typography" className="scroll-mt-8">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Typography
      </h2>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        Type scale and weights. font-bold is banned in body content.
      </p>

      {/* Font Size Scale */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Size Scale
        </h3>
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          {fontSizes.map((f) => (
            <div key={f.token} className="flex items-baseline gap-6">
              <span className="w-20 shrink-0 text-xs font-mono text-muted-foreground">
                {f.token}
              </span>
              <span className="w-12 shrink-0 text-xs text-muted-foreground">
                {f.size}
              </span>
              <span className={`${f.token} text-foreground`}>
                The quick brown fox jumps over the lazy dog
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Font Weights */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Weights
        </h3>
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          {fontWeights.map((w) => (
            <div key={w.token} className="flex items-baseline gap-6">
              <span className="w-36 shrink-0 text-xs font-mono text-muted-foreground">
                {w.token}
              </span>
              <span className={`text-base ${w.token} text-foreground`}>
                {w.label} — The quick brown fox
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Text Hierarchy Example */}
      <div>
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Hierarchy Example
        </h3>
        <div className="space-y-2 rounded-lg border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Page Title
          </h2>
          <p className="text-sm text-muted-foreground">
            Page description goes here with secondary text styling
          </p>
          <div className="pt-4">
            <h3 className="text-lg font-semibold text-foreground">
              Section Heading
            </h3>
            <p className="mt-1 text-sm text-foreground">
              Body text uses text-sm with text-foreground. This is the standard
              reading size for most content in the application.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Metadata and timestamps use text-xs with text-muted-foreground
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
