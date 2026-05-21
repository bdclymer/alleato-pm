import {
  buildPrimePcoSourceTitle,
  parseChangeEventIdsParam,
  resolveSourceChangeReason,
  resolveSourcePrimeContractId,
  type PrimePcoSourceChangeEvent,
} from "../prime-pco-source";

const sourceEvents: PrimePcoSourceChangeEvent[] = [
  {
    id: "548cbd5e-25cc-49f4-a08d-719ea4fe28f9",
    number: "001",
    title: "Move Kitchen Wall",
    reason: "Owner Request",
    prime_contract_id: "6a8f61d6-a9ae-4bf2-9ae4-bca938f05879",
  },
];

describe("prime PCO source change events", () => {
  it("parses comma-separated change event ids without blanks", () => {
    expect(parseChangeEventIdsParam(" a , , b,c ")).toEqual(["a", "b", "c"]);
    expect(parseChangeEventIdsParam(null)).toEqual([]);
  });

  it("builds the user-facing PCO title from the source change event", () => {
    expect(buildPrimePcoSourceTitle(sourceEvents)).toBe(
      "PCO for CE 001 - Move Kitchen Wall",
    );
  });

  it("resolves source contract and reason only from allowed values", () => {
    expect(
      resolveSourcePrimeContractId(
        sourceEvents,
        new Set(["6a8f61d6-a9ae-4bf2-9ae4-bca938f05879"]),
      ),
    ).toBe("6a8f61d6-a9ae-4bf2-9ae4-bca938f05879");

    expect(resolveSourceChangeReason(sourceEvents, ["Owner Request"])).toBe(
      "Owner Request",
    );
  });
});
