import {
  calculateChangeEventOverUnder,
  toCurrencyNumber,
} from "../financial-summary";

describe("change event financial summary", () => {
  it("calculates over/under from numeric or API string totals", () => {
    expect(
      calculateChangeEventOverUnder({ revenueRom: "1250.50", costRom: "1000.25" }),
    ).toBe(250.25);

    expect(
      calculateChangeEventOverUnder({ revenueRom: 900, costRom: "1000" }),
    ).toBe(-100);
  });

  it("coerces unusable currency totals to zero", () => {
    expect(toCurrencyNumber("not-a-number")).toBe(0);
    expect(toCurrencyNumber(Number.NaN)).toBe(0);
    expect(toCurrencyNumber(null)).toBe(0);
  });
});
