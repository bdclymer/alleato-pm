/** @jest-environment jsdom */

import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MoneyField } from "../MoneyField";

describe("MoneyField", () => {
  it("replaces a focused existing value when the browser appends instead of replacing", () => {
    function Harness() {
      const [value, setValue] = React.useState<number | undefined>(100);
      return <MoneyField label="Amount" inline value={value} onChange={setValue} showCurrency={false} />;
    }

    render(<Harness />);

    const input = screen.getByLabelText("Amount");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "100100" } });

    expect(input).toHaveValue("100");
  });

  it("replaces a focused existing value when the browser inserts before the old value", () => {
    function Harness() {
      const [value, setValue] = React.useState<number | undefined>(5600);
      return <MoneyField label="Amount" inline value={value} onChange={setValue} showCurrency={false} />;
    }

    render(<Harness />);

    const input = screen.getByLabelText("Amount");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "5605600" } });

    expect(input).toHaveValue("560");
  });
});
