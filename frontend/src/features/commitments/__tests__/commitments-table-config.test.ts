import {
  buildCommitmentTableColumns,
  commitmentColumns,
  commitmentDefaultVisibleColumns,
  type Commitment,
} from "../commitments-table-config";

describe("commitments table configuration", () => {
  it("keeps secondary metadata columns hidden by default", () => {
    const hiddenByDefault = [
      "cost_codes",
      "trade_names",
      "scope_summary",
      "type",
      "is_private",
      "erp_status",
    ];

    expect(commitmentDefaultVisibleColumns).not.toEqual(
      expect.arrayContaining(hiddenByDefault),
    );

    for (const columnId of hiddenByDefault) {
      expect(
        commitmentColumns.find((column) => column.id === columnId),
      ).toMatchObject({
        defaultVisible: false,
      });
    }
  });

  it("left-aligns cost codes because they are identifiers, not amounts", () => {
    expect(
      buildCommitmentTableColumns("25125").find(
        (column) => column.id === "cost_codes",
      ),
    ).toMatchObject({
      align: "left",
    });
  });

  it("right-aligns every currency column", () => {
    const columns = buildCommitmentTableColumns("25125");

    for (const columnId of [
      "original_amount",
      "approved_change_orders",
      "revised_contract_amount",
      "pending_change_orders",
      "draft_change_orders",
      "invoiced_amount",
      "payments_issued",
      "remaining_balance",
    ]) {
      expect(columns.find((column) => column.id === columnId)).toMatchObject({
        align: "right",
      });
    }
  });

  it("keeps the commitment money columns in the requested scan order after original amount", () => {
    const columnIds = commitmentColumns.map((column) => column.id);
    const originalAmountIndex = columnIds.indexOf("original_amount");

    expect(
      columnIds.slice(originalAmountIndex + 1, originalAmountIndex + 10),
    ).toEqual([
      "approved_change_orders",
      "revised_contract_amount",
      "pending_change_orders",
      "draft_change_orders",
      "invoiced_amount",
      "payments_issued",
      "percent_paid",
      "remaining_balance",
      "is_private",
    ]);

    expect(
      commitmentColumns
        .filter((column) =>
          [
            "revised_contract_amount",
            "draft_change_orders",
            "invoiced_amount",
            "payments_issued",
            "percent_paid",
            "remaining_balance",
          ].includes(column.id),
        )
        .map((column) => [column.id, column.label]),
    ).toEqual([
      ["revised_contract_amount", "Revised Contract Amount"],
      ["draft_change_orders", "Draft COs"],
      ["invoiced_amount", "Invoiced"],
      ["payments_issued", "Payments Issued"],
      ["percent_paid", "% Paid"],
      ["remaining_balance", "Remaining Balance"],
    ]);
  });

  it("lets title values inherit the standard table field color", () => {
    const titleColumn = buildCommitmentTableColumns("25125").find(
      (column) => column.id === "title",
    );
    const rendered = titleColumn?.render({
      id: "commitment-1",
      title: "Ceiling Demo",
    } as Commitment);

    expect(rendered).toMatchObject({
      props: {
        className: "font-medium",
      },
    });
  });
});
