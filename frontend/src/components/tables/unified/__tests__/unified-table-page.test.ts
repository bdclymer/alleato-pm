import {
  TABLE_ABOVE_TABLE_TOOLBAR_CLASSNAME,
  TABLE_HEADER_LABEL_CLASSNAME,
  TABLE_HEADER_MOBILE_TOOLBAR_CLASSNAME,
} from "../unified-table-page";

describe("UnifiedTablePage header labels", () => {
  it("does not truncate column headings", () => {
    expect(TABLE_HEADER_LABEL_CLASSNAME).toContain("whitespace-nowrap");
    expect(TABLE_HEADER_LABEL_CLASSNAME).not.toContain("truncate");
  });

  it("keeps the mobile table toolbar in the header until the desktop toolbar can render", () => {
    expect(TABLE_HEADER_MOBILE_TOOLBAR_CLASSNAME).toContain("lg:hidden");
    expect(TABLE_HEADER_MOBILE_TOOLBAR_CLASSNAME).not.toContain("sm:hidden");
    expect(TABLE_ABOVE_TABLE_TOOLBAR_CLASSNAME).toContain("lg:flex");
    expect(TABLE_ABOVE_TABLE_TOOLBAR_CLASSNAME).not.toContain("sm:flex");
  });
});
