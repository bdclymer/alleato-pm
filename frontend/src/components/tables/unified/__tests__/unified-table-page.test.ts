import {
  TABLE_ABOVE_TABLE_TOOLBAR_CLASSNAME,
  TABLE_FULL_BLEED_PAGE_CONTAINER_CLASSNAME,
  TABLE_FULL_BLEED_SCROLL_SHELL_CLASSNAME,
  TABLE_HEADER_LABEL_CLASSNAME,
  TABLE_HEADER_MOBILE_TOOLBAR_CLASSNAME,
  TABLE_SPLIT_VIEW_CONTAINER_CLASSNAME,
  TABLE_SPLIT_VIEW_PAGE_CONTAINER_CLASSNAME,
  shouldRenderRowSelection,
  shouldUseIconOnlyInlineEdit,
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

  it("keeps editable name columns on icon-only editing by default", () => {
    expect(shouldUseIconOnlyInlineEdit({ id: "name" })).toBe(true);
    expect(shouldUseIconOnlyInlineEdit({ id: "email" })).toBe(false);
    expect(
      shouldUseIconOnlyInlineEdit({ id: "email", editTrigger: "icon" }),
    ).toBe(true);
    expect(
      shouldUseIconOnlyInlineEdit({ id: "name", editTrigger: "cell" }),
    ).toBe(false);
  });

  it("keeps split views on a flex-fill, overflow-contained layout contract", () => {
    expect(TABLE_SPLIT_VIEW_CONTAINER_CLASSNAME).toContain("h-full");
    expect(TABLE_SPLIT_VIEW_CONTAINER_CLASSNAME).toContain("min-h-0");
    expect(TABLE_SPLIT_VIEW_CONTAINER_CLASSNAME).toContain("flex-1");
    expect(TABLE_SPLIT_VIEW_CONTAINER_CLASSNAME).toContain("overflow-hidden");
    expect(TABLE_SPLIT_VIEW_CONTAINER_CLASSNAME).not.toContain("100dvh");
    expect(TABLE_SPLIT_VIEW_PAGE_CONTAINER_CLASSNAME).toContain("h-full");
    expect(TABLE_SPLIT_VIEW_PAGE_CONTAINER_CLASSNAME).toContain("min-h-0");
    expect(TABLE_SPLIT_VIEW_PAGE_CONTAINER_CLASSNAME).toContain("overflow-hidden");
    expect(TABLE_SPLIT_VIEW_PAGE_CONTAINER_CLASSNAME).toContain("pb-0");
    expect(TABLE_SPLIT_VIEW_PAGE_CONTAINER_CLASSNAME).not.toContain("100dvh");
  });

  it("lets full-bleed tables escape the page gutter instead of clipping the last columns", () => {
    expect(TABLE_FULL_BLEED_PAGE_CONTAINER_CLASSNAME).toContain(
      "overflow-x-visible",
    );
    expect(TABLE_FULL_BLEED_SCROLL_SHELL_CLASSNAME).toContain("-mx-4");
    expect(TABLE_FULL_BLEED_SCROLL_SHELL_CLASSNAME).toContain(
      "w-[calc(100%+2rem)]",
    );
    expect(TABLE_FULL_BLEED_SCROLL_SHELL_CLASSNAME).toContain("sm:-mx-6");
    expect(TABLE_FULL_BLEED_SCROLL_SHELL_CLASSNAME).toContain(
      "sm:w-[calc(100%+3rem)]",
    );
    expect(TABLE_FULL_BLEED_SCROLL_SHELL_CLASSNAME).toContain("lg:-mx-8");
    expect(TABLE_FULL_BLEED_SCROLL_SHELL_CLASSNAME).toContain(
      "lg:w-[calc(100%+4rem)]",
    );
  });

  it("defaults row selection on unless a page explicitly opts out", () => {
    expect(shouldRenderRowSelection()).toBe(true);
    expect(shouldRenderRowSelection({ enableRowSelection: true })).toBe(true);
    expect(shouldRenderRowSelection({ enableRowSelection: false })).toBe(
      false,
    );
  });
});
