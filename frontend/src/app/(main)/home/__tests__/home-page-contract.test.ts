import fs from "node:fs";
import path from "node:path";

const homePagePath = path.join(process.cwd(), "src/app/(main)/home/page.tsx");

describe("home action dashboard contract", () => {
  it("keeps the post-login page organized around actionable work recovery", () => {
    const source = fs.readFileSync(homePagePath, "utf8");

    expect(source).toContain('"Start here"');
    expect(source).toContain('"Work queue"');
    expect(source).toContain('"Resume projects"');
    expect(source).toContain('"Review queue"');
    expect(source).toContain('"Recent movement"');
    expect(source).toContain('"Source wiring"');
  });

  it("keeps unfinished intelligence clearly marked as pending source wiring", () => {
    const source = fs.readFileSync(homePagePath, "utf8");

    expect(source).toContain("Pending source wiring");
    expect(source).toContain("needs a homepage-specific brief API contract");
    expect(source).toContain("needs a shared unread/priority inbox source");
    expect(source).not.toContain("Uses the existing executive brief surface while homepage synthesis is wired.");
    expect(source).not.toContain("No dated tasks are due today from your current task feed.");
  });
});
