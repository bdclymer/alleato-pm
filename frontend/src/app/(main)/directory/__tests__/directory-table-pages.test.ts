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
});
