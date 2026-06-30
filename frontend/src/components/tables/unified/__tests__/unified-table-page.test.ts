import {
  TABLE_ABOVE_TABLE_TOOLBAR_CLASSNAME,
  TABLE_HEADER_LABEL_CLASSNAME,
  TABLE_HEADER_MOBILE_TOOLBAR_CLASSNAME,
  TABLE_SPLIT_VIEW_CONTAINER_CLASSNAME,
  TABLE_SPLIT_VIEW_PAGE_CONTAINER_CLASSNAME,
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

  it("keeps split views on a viewport-height, overflow-contained layout contract", () => {
    expect(TABLE_SPLIT_VIEW_CONTAINER_CLASSNAME).toContain("h-[calc(100dvh-6rem)]");
    expect(TABLE_SPLIT_VIEW_CONTAINER_CLASSNAME).toContain("min-h-[calc(100dvh-6rem)]");
    expect(TABLE_SPLIT_VIEW_CONTAINER_CLASSNAME).toContain("overflow-hidden");
    expect(TABLE_SPLIT_VIEW_PAGE_CONTAINER_CLASSNAME).toContain("h-[calc(100dvh-4rem)]");
    expect(TABLE_SPLIT_VIEW_PAGE_CONTAINER_CLASSNAME).toContain("overflow-hidden");
    expect(TABLE_SPLIT_VIEW_PAGE_CONTAINER_CLASSNAME).toContain("pb-0");
  });
});
