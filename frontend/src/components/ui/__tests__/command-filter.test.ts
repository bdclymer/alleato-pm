import { substringFilter } from "../command";

describe("substringFilter", () => {
  it("matches command items by keyword aliases as well as item value", () => {
    expect(substringFilter("871", "goodwill", ["Goodwill Industries"])).toBe(1);
  });

  it("does not return unrelated substring matches", () => {
    expect(substringFilter("871", "goodwill", ["Acme Construction"])).toBe(0);
  });
});
