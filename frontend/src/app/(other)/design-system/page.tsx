"use client";

import { ColorPaletteSection } from "./_sections/color-palette";
import { TypographySection } from "./_sections/typography";
import { SpacingSection } from "./_sections/spacing";
import { ButtonsStatesSection } from "./_sections/buttons-states";
import { FormInputsSection } from "./_sections/form-inputs";
import { DataDisplaySection } from "./_sections/data-display";
import { FeedbackSection } from "./_sections/feedback";
import { OverlaysSection } from "./_sections/overlays";
import { NavigationSection } from "./_sections/navigation";
import { LayoutExamplesSection } from "./_sections/layout-examples";
import { ReferenceComponentsSection } from "./_sections/reference-components";

const navItems = [
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing" },
  { id: "buttons", label: "Buttons" },
  { id: "form-inputs", label: "Form Inputs" },
  { id: "data-display", label: "Data Display" },
  { id: "feedback", label: "Feedback" },
  { id: "overlays", label: "Overlays" },
  { id: "navigation", label: "Navigation" },
  { id: "layouts", label: "Layout Examples" },
  { id: "reference", label: "Reference Components" },
];

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border bg-card px-8 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Design System
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visual reference for all tokens, components, and layout patterns.
          Every color, spacing value, and component shown here is the single
          source of truth.
        </p>
      </div>

      <div className="flex">
        {/* Sticky Sidebar Navigation */}
        <nav className="sticky top-0 hidden h-screen w-56 shrink-0 overflow-y-auto border-r border-border bg-card px-4 py-6 lg:block">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Sections
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <main className="min-w-0 flex-1 px-8 py-8">
          <div className="mx-auto max-w-5xl space-y-20">
            <ColorPaletteSection />
            <TypographySection />
            <SpacingSection />
            <ButtonsStatesSection />
            <FormInputsSection />
            <DataDisplaySection />
            <FeedbackSection />
            <OverlaysSection />
            <NavigationSection />
            <LayoutExamplesSection />
            <ReferenceComponentsSection />
          </div>
        </main>
      </div>
    </div>
  );
}
