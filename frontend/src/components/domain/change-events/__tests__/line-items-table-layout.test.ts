import { readFileSync } from "node:fs";
import { join } from "node:path";

const componentPath = join(
  process.cwd(),
  "src/components/domain/change-events/ChangeEventLineItemsTable.tsx",
);

describe("ChangeEventLineItemsTable layout", () => {
  it("keeps Revenue ROM visible outside the expectingRevenue-only detail columns", () => {
    const source = readFileSync(componentPath, "utf8");
    const tableStart = source.indexOf("<InlineTableHeader");
    const summaryStart = source.indexOf('<InlineTableHeaderCell colSpan={3}', tableStart);
    const revenueRomHeader = source.indexOf(">Revenue ROM</InlineTableHeaderCell>", summaryStart);
    const nonCommittedHeader = source.indexOf(">Non-committed</InlineTableHeaderCell>", summaryStart);

    expect(tableStart).toBeGreaterThan(-1);
    expect(summaryStart).toBeGreaterThan(tableStart);
    expect(revenueRomHeader).toBeGreaterThan(summaryStart);
    expect(nonCommittedHeader).toBeGreaterThan(revenueRomHeader);

    const conditionalStart = source.lastIndexOf("{expectingRevenue &&", revenueRomHeader);
    const conditionalEnd = source.indexOf(")}", conditionalStart);
    expect(revenueRomHeader).toBeGreaterThan(conditionalEnd);
  });
});
