import fs from "node:fs";
import path from "node:path";

const directoryRoot = path.join(__dirname, "..");

const listPages = [
  "companies/page.tsx",
  "clients/page.tsx",
  "contacts/page.tsx",
  "employees/page.tsx",
  "groups/page.tsx",
  "prospects/page.tsx",
  "vendors/page.tsx",
];

const legacyTablePatterns = [
  /companies-data-table/,
  /contacts-data-table/,
  /employees-data-table/,
  /GenericDataTable/,
  /DirectoryTable/,
  /Responsive(?:Companies|Users|DistributionGroups)Table/,
];

describe("directory list table pages", () => {
  it.each(listPages)("keeps %s on the unified table shell", (relativePath) => {
    const source = fs.readFileSync(
      path.join(directoryRoot, relativePath),
      "utf8",
    );
    const delegatesToUnifiedCompaniesPage =
      relativePath === "clients/page.tsx" &&
      source.includes('export { default } from "../companies/page"');

    expect(source).toEqual(
      expect.stringMatching(
        delegatesToUnifiedCompaniesPage
          ? /companies\/page/
          : /UnifiedTablePage/,
      ),
    );

    for (const legacyPattern of legacyTablePatterns) {
      expect(source).not.toMatch(legacyPattern);
    }
  });

  it.each(["employees/page.tsx", "groups/page.tsx"])(
    "does not expose dead row selection on %s",
    (relativePath) => {
      const source = fs.readFileSync(
        path.join(directoryRoot, relativePath),
        "utf8",
      );

      expect(source).not.toContain("selection={{");
      expect(source).not.toContain("enableRowSelection: true");
      expect(source).not.toContain("selectedCount: tableState.selectedIds.length");
    },
  );

  it("keeps prospects off browser Supabase select-star access", () => {
    const source = fs.readFileSync(
      path.join(directoryRoot, "prospects/page.tsx"),
      "utf8",
    );

    expect(source).not.toContain('from "@/lib/supabase/client"');
    expect(source).not.toContain('select("*")');
    expect(source).toContain('apiFetch<ProspectsResponse>("/api/directory/prospects")');
  });
});
