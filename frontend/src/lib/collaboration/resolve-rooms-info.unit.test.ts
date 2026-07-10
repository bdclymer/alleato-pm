import { describeRoom, resolveRoomsInfo } from "./resolve-rooms-info";

describe("describeRoom", () => {
  it("names a page room by its deepest known section and rebuilds the URL", () => {
    const roomId =
      "alleato:page:1067:prime-contracts:a5d7dbe0-2171-45d5-abe8-f6866d837d5f:change-orders:pcos:f44fbfd1-5b9a-4e14-9bd9-74f983fb04fd";

    expect(describeRoom(roomId)).toEqual({
      name: "Change Order",
      url: "/1067/prime-contracts/a5d7dbe0-2171-45d5-abe8-f6866d837d5f/change-orders/pcos/f44fbfd1-5b9a-4e14-9bd9-74f983fb04fd",
    });
  });

  it("uses the friendly label for a simple section page", () => {
    expect(describeRoom("alleato:page:876:rfis")).toEqual({
      name: "RFI",
      url: "/876/rfis",
    });
  });

  it("falls back to a title-cased segment for unknown sections", () => {
    expect(describeRoom("alleato:page:876:widgets")).toEqual({
      name: "Widgets",
      url: "/876/widgets",
    });
  });

  it("labels the project home page", () => {
    expect(describeRoom("alleato:page:876:home")).toEqual({
      name: "Project Home",
      url: "/876/home",
    });
  });

  it("labels the app root ('/') page as Home and links to '/', not the raw sentinel", () => {
    // pageRoomId() collapses "/" to the sentinel segment "root".
    expect(describeRoom("alleato:page:root")).toEqual({
      name: "Home",
      url: "/",
    });
  });

  it("names an entity room from its entity type", () => {
    expect(describeRoom("alleato:rfi:123")).toEqual({ name: "Rfi" });
    expect(describeRoom("alleato:change-order:456")).toEqual({
      name: "Change Order",
    });
  });

  it("never surfaces a raw id for an unrecognized room shape", () => {
    expect(describeRoom("some-opaque-room")).toEqual({ name: "Comment" });
  });
});

describe("resolveRoomsInfo", () => {
  it("resolves each room id, preserving order", () => {
    expect(
      resolveRoomsInfo({ roomIds: ["alleato:page:1:budget", "alleato:rfi:9"] }),
    ).toEqual([
      { name: "Budget", url: "/1/budget" },
      { name: "Rfi" },
    ]);
  });
});
