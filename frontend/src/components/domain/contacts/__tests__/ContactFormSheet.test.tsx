/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { ContactFormSheet } from "../ContactFormSheet";

// --- Mocks -----------------------------------------------------------------

// Supabase client: the sheet fetches companies on open.
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        order: () =>
          Promise.resolve({
            data: [{ id: "company-1", name: "Acme Construction" }],
            error: null,
          }),
      }),
    }),
  }),
}));

// Server actions are never invoked in this flow, but must resolve as modules.
jest.mock("@/app/(main)/actions/table-actions", () => ({
  createContact: jest.fn(),
  updateContact: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Render the company dialog as a simple marker so we can assert it opened.
jest.mock("@/components/domain/companies/CompanyFormDialog", () => ({
  CompanyFormDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="company-dialog">Company dialog</div> : null,
}));

// jsdom lacks pointer-capture / scrollIntoView that Radix Popover + cmdk use.
beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn();
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

// --- Tests -----------------------------------------------------------------

describe("ContactFormSheet — company combobox", () => {
  it("opens the company dialog without closing the sheet when 'Add New Company' is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();

    render(
      <ContactFormSheet open onOpenChange={onOpenChange} contact={null} />,
    );

    // Wait for companies to load — the trigger label flips from
    // "Loading companies..." to "Select company" and becomes enabled.
    const triggerLabel = await screen.findByText("Select company");
    const combobox = triggerLabel.closest<HTMLButtonElement>(
      '[role="combobox"]',
    );
    expect(combobox).not.toBeNull();
    await waitFor(() => expect(combobox).not.toBeDisabled());

    // Open the company combobox popover.
    await user.click(combobox!);

    // Click "Add New Company" inside the popover. Before the fix this threw
    // `ReferenceError: setOpen is not defined` and crashed the click handler.
    const addCompany = await screen.findByRole("button", {
      name: /add new company/i,
    });
    await user.click(addCompany);

    // The company creation dialog should open...
    expect(await screen.findByTestId("company-dialog")).toBeInTheDocument();

    // ...and the sheet itself must NOT be closed by this action.
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
