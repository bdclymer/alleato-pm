import { listSpecificationLookupOptions } from "../compatibility";

function buildQuery(result: unknown) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(result),
  };
}

describe("listSpecificationLookupOptions", () => {
  it("uses canonical specification sections before legacy specifications", async () => {
    const canonicalQuery = buildQuery({
      data: [
        {
          id: 12,
          section_number: "08-1113",
          title: "Doors, Frames, Hardware",
          status: "active",
        },
      ],
      error: null,
    });
    const legacyQuery = buildQuery({ data: [], error: null });
    const from = jest
      .fn()
      .mockReturnValueOnce(canonicalQuery)
      .mockReturnValueOnce(legacyQuery);

    const result = await listSpecificationLookupOptions({ from } as never, 876);

    expect(result).toEqual([
      {
        id: "12",
        section_number: "08-1113",
        section_title: "Doors, Frames, Hardware",
        division: "Division 08",
        source: "specification_sections",
      },
    ]);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("specification_sections");
  });

  it("falls back to the legacy table only when canonical sections are empty", async () => {
    const canonicalQuery = buildQuery({ data: [], error: null });
    const legacyQuery = buildQuery({
      data: [
        {
          id: "legacy-1",
          section_number: "03-3000",
          section_title: "Cast-in-Place Concrete",
          division: "Concrete",
          status: "active",
        },
      ],
      error: null,
    });
    const from = jest
      .fn()
      .mockReturnValueOnce(canonicalQuery)
      .mockReturnValueOnce(legacyQuery);

    await expect(listSpecificationLookupOptions({ from } as never, 876)).resolves.toEqual([
      {
        id: "legacy-1",
        section_number: "03-3000",
        section_title: "Cast-in-Place Concrete",
        division: "Concrete",
        source: "specifications",
      },
    ]);
    expect(from).toHaveBeenNthCalledWith(2, "specifications");
  });

  it("fails loudly when canonical lookup errors", async () => {
    const canonicalQuery = buildQuery({
      data: null,
      error: { message: "permission denied" },
    });
    const from = jest.fn().mockReturnValueOnce(canonicalQuery);

    await expect(listSpecificationLookupOptions({ from } as never, 876)).rejects.toThrow(
      "Could not load canonical specification sections: permission denied",
    );
  });
});
