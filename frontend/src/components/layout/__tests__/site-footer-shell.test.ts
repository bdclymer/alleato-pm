import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const source = (path: string) =>
  readFileSync(join(projectRoot, path), "utf8");

describe("App shell full-height workspaces", () => {
  it("keeps table workspaces footerless so split views can fill the app height", () => {
    const tableSource = source("src/app/(tables)/layout.tsx");

    expect(tableSource).not.toContain("components/layout/site-footer");
    expect(tableSource).not.toContain("<SiteFooter");
    expect(tableSource).toContain("h-svh overflow-hidden");
    expect(tableSource).toContain("flex min-h-0 min-w-0 flex-1 flex-col");
  });

  it("suppresses footers for full-height split routes in other app shells", () => {
    const mainSource = source("src/app/(main)/layout.tsx");
    const adminSource = source("src/app/(admin)/layout.tsx");

    expect(mainSource).toContain("isFullHeightWorkspace");
    expect(mainSource).toContain("\\/tasks");
    expect(mainSource).toContain("!isFullHeightWorkspace");
    expect(mainSource).toContain("flex min-h-0 min-w-0 flex-1 flex-col overflow-auto");

    expect(adminSource).toContain('pathname === "/outlook-draft-feedback"');
    expect(adminSource).toContain("{!hideFooter && <SiteFooter />}");
  });
});
