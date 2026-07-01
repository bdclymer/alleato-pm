import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { defineTutorial, type TutorialSeedData } from "../tutorial-recorder";

interface CreatePrimeContractData extends TutorialSeedData {
  projectId: number;
  contractNumber: string;
  title: string;
  description: string;
  defaultRetainage: string;
  sovDescription: string;
  sovAmount: string;
  inclusions: string;
  exclusions: string;
  submitWorkflow: boolean;
}

export default defineTutorial<CreatePrimeContractData>({
  id: "prime-contracts.create-prime-contract",
  title: "Create a prime contract",
  module: "prime-contracts",
  slug: "create-a-prime-contract",
  description:
    "Create a prime contract with contract details, dates, schedule-of-values lines, and scope notes for owner billing.",
  dataPath: "./prime-contracts-create-prime-contract.data.json",
  maskSelectors: [
    '[data-sensitive="true"]',
    '[name*="email" i]',
    '[name*="phone" i]',
  ],
  async workflow({ data, page, tutorial }) {
    const createRoute = `/${data.projectId}/prime-contracts/new`;

    await tutorial.step(
      {
        title: "Open the new prime contract form",
        instruction:
          "Open Prime Contracts in the project and start a new contract to load the Create Prime Contract form.",
        expected: "The Create Prime Contract page opens with General Information visible.",
        screenshot: { mode: "viewport" },
        calloutSelector: 'text=Create Prime Contract, text=General Information',
      },
      async () => {
        await tutorial.goto(createRoute);
        await tutorial.requireUrl("/prime-contracts/new", "Open the new prime contract form");
      },
    );

    await tutorial.step(
      {
        title: "Fill out the contract details",
        instruction:
          "Enter the Contract number and Title. Select the Owner/Client, confirm the contract status, and set the default retainage for the agreement.",
        expected:
          "The contract header identifies the owner contract and how retainage should be calculated.",
        screenshot: { mode: "viewport" },
        calloutSelector: 'text=General Information',
      },
      async () => {
        await page.getByPlaceholder(/enter contract number/i).fill(data.contractNumber).catch(() => undefined);
        await page.locator('[data-testid="owner-client-select"]').click().catch(() => undefined);
        await page.locator('[role="option"], [data-slot="select-item"]').first().click().catch(() => undefined);
        await page.getByRole("textbox", { name: /title/i }).fill(data.title).catch(() => undefined);
        await tutorial.fillByLabel(/default retainage/i, data.defaultRetainage).catch(() => undefined);
        await page.getByRole("checkbox", { name: /contract is executed/i }).check().catch(() => undefined);
      },
    );

    await tutorial.step(
      {
        title: "Add the contract narrative and attachment",
        instruction:
          "Enter a description of the agreement and attach any supporting contract file or exhibit needed for the record.",
        expected: "The contract description and attachment area are populated.",
        screenshot: { mode: "viewport" },
        calloutSelector: 'text=Description, text=Attachments',
      },
      async () => {
        await page.getByPlaceholder(/enter contract description/i).fill(data.description).catch(() => undefined);
        const fixturePath = path.join(os.tmpdir(), "alleato-tutorial-prime-contract-attachment.txt");
        await writeFile(fixturePath, "Tutorial fixture: prime contract attachment.\n", "utf8");
        await tutorial.uploadFirstFile(fixturePath).catch(() => undefined);
      },
    );

    await tutorial.step(
      {
        title: "Set the contract dates",
        instruction:
          "Enter the Start Date and Estimated Completion Date so the contract timeline is established from the start.",
        expected: "The prime contract includes the key contract dates.",
        screenshot: { mode: "viewport" },
        calloutSelector: 'text=Contract Dates',
      },
      async () => {
        await page.getByRole("textbox", { name: /start date/i }).fill("07/01/2026").catch(() => undefined);
        await page.getByRole("textbox", { name: /estimated completion date/i }).fill("12/31/2026").catch(() => undefined);
      },
    );

    await tutorial.step(
      {
        title: "Build the schedule of values",
        instruction:
          "In Schedule of Values, add a line item, select the Budget Code, enter the line description, and enter the contract amount for that scope.",
        expected: "The SOV shows at least one priced line item and updates the totals.",
        screenshot: { mode: "viewport" },
        calloutSelector: 'text=Schedule of Values, button:has-text("Add Line Item")',
      },
      async () => {
        await page.getByRole("button", { name: /add line item/i }).first().click().catch(() => undefined);
        await page.locator('[data-testid="sov-table"] [role="combobox"]').first().click().catch(() => undefined);
        await page.locator('[role="option"], [data-slot="select-item"]').first().click().catch(() => undefined);
        await page.getByRole("textbox", { name: /description/i }).last().fill(data.sovDescription).catch(() => undefined);
        await page.getByRole("textbox", { name: /amount/i }).fill(data.sovAmount).catch(() => undefined);
      },
    );

    await tutorial.step(
      {
        title: "Define inclusions and exclusions",
        instruction:
          "Document the included scope and any exclusions so the owner contract is clear before execution.",
        expected: "The scope section captures what is included and excluded from the contract.",
        screenshot: { mode: "viewport" },
        calloutSelector: 'text=Inclusions, text=Exclusions',
      },
      async () => {
        const textareas = page.locator("textarea");
        await textareas.nth(1).fill(data.inclusions).catch(() => undefined);
        await textareas.nth(2).fill(data.exclusions).catch(() => undefined);
      },
    );

    await tutorial.step(
      {
        title: "Create the prime contract",
        instruction:
          "Select Create Prime Contract to save the contract. Tutorial runs stay in preview mode unless submitWorkflow is true.",
        expected: data.submitWorkflow
          ? "The prime contract is saved and opens on the contract detail page."
          : "The completed form is ready to save without creating demo data.",
        screenshot: { mode: "viewport" },
        calloutSelector: 'button:has-text("Create Prime Contract")',
      },
      async () => {
        if (data.submitWorkflow) {
          await page.getByRole("button", { name: /create prime contract/i }).click().catch(() => undefined);
        }
      },
    );
  },
});
