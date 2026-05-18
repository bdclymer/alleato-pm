import * as XLSX from "xlsx";

import { parseAlleatoEstimateWorkbook } from "./estimate-workbook-sov";

describe("parseAlleatoEstimateWorkbook", () => {
  it("does not warn for estimate rows with blank cost type values", () => {
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Alleato Prime Contract SOV Import Template"],
        ["Fill rows below. Keep sheet names and column order unchanged."],
        ["Cost Code", "Description", "Cost Type", "Budget Amount"],
        ["01-1000", "General Requirements", "", 0],
      ]),
      "General Conditions",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        [
          "Cost Code",
          "Cost Type",
          "Description",
          "Work Description",
          "Budget Amount",
        ],
        ["03-3000", "", "Concrete", "Slab and footings", 100],
      ]),
      "Details",
    );

    const preview = parseAlleatoEstimateWorkbook(workbook);

    expect(preview.warnings).toEqual([]);
    expect(preview.rows).toHaveLength(2);
    expect(preview.rows.every((row) => row.warnings.length === 0)).toBe(true);
    expect(preview.rows.every((row) => !row.includeInOwnerSov)).toBe(true);
  });

  it("still warns for unknown nonblank cost type values", () => {
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Alleato Prime Contract SOV Import Template"],
        ["Fill rows below. Keep sheet names and column order unchanged."],
        ["Cost Code", "Description", "Cost Type", "Budget Amount"],
        ["01-1000", "General Requirements", "Not A Type", 100],
      ]),
      "General Conditions",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        [
          "Cost Code",
          "Cost Type",
          "Description",
          "Work Description",
          "Budget Amount",
        ],
      ]),
      "Details",
    );

    const preview = parseAlleatoEstimateWorkbook(workbook);

    expect(preview.warnings).toEqual([
      'General Conditions row 4: Cost type "Not A Type" is not importable.',
    ]);
  });
});
