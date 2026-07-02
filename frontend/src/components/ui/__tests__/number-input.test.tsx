/** @jest-environment jsdom */

import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NumberInput } from "../number-input";

describe("NumberInput", () => {
  it("renders zero as placeholder content when clearZeroOnFocus is enabled", () => {
    render(
      <NumberInput
        value="0"
        onChange={() => undefined}
        formatOnBlur={false}
        clearZeroOnFocus
        placeholder="0"
      />,
    );

    const input = screen.getByPlaceholderText("0");
    expect(input).toHaveValue("");
  });

  it("replaces a focused zero value when the browser appends instead of replacing", () => {
    function Harness() {
      const [value, setValue] = React.useState("0");
      return <NumberInput value={value} onChange={(event) => setValue(event.target.value)} formatOnBlur={false} />;
    }

    render(<Harness />);

    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "02" } });

    expect(input).toHaveValue("2");
  });

  it("replaces a focused zero value when the browser inserts before the old value", () => {
    function Harness() {
      const [value, setValue] = React.useState("0");
      return <NumberInput value={value} onChange={(event) => setValue(event.target.value)} formatOnBlur={false} />;
    }

    render(<Harness />);

    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "20" } });

    expect(input).toHaveValue("2");
  });
});
