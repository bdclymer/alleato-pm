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
    expect(clientSource).toContain('route.route.includes("/edit")');
  });
});
