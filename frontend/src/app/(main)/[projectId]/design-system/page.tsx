import { PageContainer, ProjectPageHeader } from "@/components/layout";
import type { ReactElement } from "react";
import path from "path";
import { readdir } from "fs/promises";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ComponentEntry = {
  name: string;
  file: string;
};

const getUiComponents = async (): Promise<ComponentEntry[]> => {
  const candidates = [
    path.join(process.cwd(), "frontend", "src", "components", "ui"),
    path.join(process.cwd(), "src", "components", "ui"),
  ];

  for (const dir of candidates) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      const files = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => name.endsWith(".tsx") || name.endsWith(".ts"))
        .filter((name) => !name.includes("__tests__"))
        .filter((name) => !name.endsWith(".test.tsx"))
        .filter((name) => !name.endsWith(".test.ts"));

      return files
        .map((file) => ({
          file,
          name: file.replace(/\.(tsx|ts)$/u, ""),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      continue;
    }
  }

  return [];
};

export default async function DesignSystemPage(): Promise<ReactElement> {
  const uiComponents = await getUiComponents();

  return (
    <PageContainer className="space-y-6">
      <ProjectPageHeader
        title="Design System"
        description="Single source of truth for UI standards, tokens, and components."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Rules of Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="space-y-2">
              <p className="text-foreground font-medium">Principles</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use design tokens from `globals.css` for all colors and spacing.</li>
                <li>Do not add custom colors or gradients in feature code.</li>
                <li>All inputs must use shared UI components (`Input`, `NumberInput`, `Select`).</li>
                <li>Buttons must use the standard variants: `default`, `outline`, or `ghost`.</li>
                <li>Modals/Slideover should use unified components from `components/ui`.</li>
              </ul>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-foreground font-medium">Canonical Sources</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>`/Users/meganharrison/Documents/github/alleato-procore/frontend/src/app/globals.css`</li>
                <li>`/Users/meganharrison/Documents/github/alleato-procore/frontend/src/components/ui/UNIFIED-COMPONENTS-USAGE.md`</li>
                <li>`/Users/meganharrison/Documents/github/alleato-procore/frontend/src/design-system/spacing.ts`</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>UI Components</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {uiComponents.length === 0 ? (
              <p className="text-muted-foreground">No UI components found.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {uiComponents.map((component) => (
                  <div
                    key={component.file}
                    className="flex items-center justify-between rounded-md border border-border px-4 py-2"
                  >
                    <span className="font-medium text-foreground">{component.name}</span>
                    <span className="text-xs text-muted-foreground">{component.file}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
