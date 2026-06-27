import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("outlook draft feedback access contract", () => {
  const routeDir = join(
    process.cwd(),
    "src/app/(admin)/outlook-draft-feedback",
  );

  it("keeps owner-or-Brandon access in the layout without reapplying admin-only page access", () => {
    const layoutSource = readFileSync(join(routeDir, "layout.tsx"), "utf8");
    const pageSource = readFileSync(join(routeDir, "page.tsx"), "utf8");

    expect(layoutSource).toContain("requireOwnerOrEmails");
    expect(layoutSource).toContain("bclymer@alleatogroup.com");
    expect(pageSource).not.toContain("requireAdmin");
  });
});
