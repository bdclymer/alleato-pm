import { TABLE_HEADER_LABEL_CLASSNAME } from "../unified-table-page";

describe("UnifiedTablePage header labels", () => {
  it("does not truncate column headings", () => {
    expect(TABLE_HEADER_LABEL_CLASSNAME).toContain("whitespace-normal");
    expect(TABLE_HEADER_LABEL_CLASSNAME).not.toContain("truncate");
  });
});
