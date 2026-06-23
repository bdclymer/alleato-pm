import { readFileSync } from "fs";
import { join } from "path";

const siteMapDir = join(process.cwd(), "src/app/(admin)/site-map");

describe("site-map layout options", () => {
  it("keeps edit routes as a first-class layout option", () => {
    const clientSource = readFileSync(join(siteMapDir, "site-map-client.tsx"), "utf8");
    const pageSource = readFileSync(join(siteMapDir, "page.tsx"), "utf8");

    expect(clientSource).toContain('| "Edit"');
    expect(clientSource).toMatch(/const LAYOUTS:[\s\S]*"Form",\n\s*"Edit",/);
    expect(pageSource).toMatch(/routeLower\.endsWith\("\/edit"\)[\s\S]*return "Edit";/);
    expect(clientSource).toContain('route.layout === "Edit"');
  });

  it("keeps layout tabs strict to the selected route layout", () => {
    const clientSource = readFileSync(join(siteMapDir, "site-map-client.tsx"), "utf8");

    expect(clientSource).toContain('"detail-pages": "Detail Pages"');
    expect(clientSource).toContain('"edit-pages": "Edit Pages"');
    expect(clientSource).toContain('"deprecated-pages": "Deprecated"');
    expect(clientSource).toMatch(/const LAYOUTS:[\s\S]*"Content",\n\s*"Deprecated",\n\s*"Other",/);
    expect(clientSource).toContain('if (tab === "table-pages") return isPageRoute && route.layout === "Table";');
    expect(clientSource).toContain('if (tab === "form-pages") return isPageRoute && route.layout === "Form";');
    expect(clientSource).toContain('if (tab === "detail-pages") return isPageRoute && route.layout === "Detail";');
    expect(clientSource).toContain('if (tab === "edit-pages") return isPageRoute && route.layout === "Edit";');
    expect(clientSource).toContain('if (tab === "deprecated-pages") return isPageRoute && route.layout === "Deprecated";');
    expect(clientSource).toContain('value === "deprecated-pages"');
    expect(clientSource).not.toContain('tab === "form-pages") return isPageRoute && (route.type === "Workflow"');
    expect(clientSource).not.toContain('tab === "table-pages") return isPageRoute && (route.type === "Database / Table"');
  });
});
