import { getSplitPageFrameHeightClass } from "@/components/ui/split-page";

describe("getSplitPageFrameHeightClass", () => {
  it("supports a parent-fill height contract for embedded workspaces", () => {
    const className = getSplitPageFrameHeightClass("fill");
    expect(className).toContain("h-full");
    expect(className).toContain("flex-1");
    expect(className).not.toContain("100dvh");
  });
});
