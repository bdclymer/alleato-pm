/**
 * E2E smoke test: project documents browser
 *
 * Route: /<projectId>/documents (e.g. /1009/documents)
 * Layout: SmartGroupRail (left) | card/list grid (middle) | PreviewPane (right)
 *
 * Real selectors derived from source:
 * - "Smart groups" text: <p> element in SmartGroupRail (smart-group-rail.tsx line 91)
 * - "All" group button: <Button variant="ghost"> rendered by RailItem with group.label (line 73)
 * - Document cards: <Button type="button" variant="ghost"> rendered by renderDocumentCard()
 *   (documents-table-config.tsx line 486). No aria-label on the card itself — selected by
 *   locating buttons within the card grid container. NOTE: these cards have no data-testid;
 *   adding data-testid="document-card" to renderDocumentCard is a recommended future guardrail.
 * - "Toggle info" button: <Button aria-label="Toggle info"> in PreviewPane toolbar (preview-pane.tsx line 103)
 *   Only present after a doc is selected (not shown on the empty-state pane).
 * - Resize separator: role="separator" aria-label="Resize preview" (project-documents-browser.tsx line 135)
 */

import { test, expect } from "@playwright/test";

test.describe("project documents browser", () => {
  test("rail, card selection, toggle-info, and resize handle work", async ({
    page,
  }) => {
    await page.goto("/1009/documents");
    await page.waitForLoadState("domcontentloaded");

    // ── 1. Smart group rail is present ──────────────────────────────────────
    // "Smart groups" is a <p> element (not a heading) inside the rail nav.
    await expect(page.getByText("Smart groups")).toBeVisible();

    // "All" group button (RailItem renders a <Button> whose visible text is the label).
    await expect(
      page.getByRole("button", { name: /^All/ }),
    ).toBeVisible();

    // ── 2. At least one document card is visible ─────────────────────────────
    // Cards are <Button type="button" variant="ghost"> with a title <span> inside.
    // The card grid is inside the DocumentsTablePage component. We locate the first
    // ghost button that has a visible title span — this is the card's clickable area.
    // We wait up to 15 s because cards load from the API after mount.
    const firstCard = page
      .locator(
        'button[type="button"].h-auto.flex.flex-col',
      )
      .first();

    await expect(firstCard).toBeVisible({ timeout: 15_000 });

    // ── 3. Clicking the card wires selection → PreviewPane toolbar appears ───
    // PreviewPane shows an empty-state (no toolbar) when doc is null.
    // After clicking a card, PreviewPane renders a toolbar containing
    // <Button aria-label="Toggle info"> (preview-pane.tsx line 103).
    // Cards are wrapped in a DnD draggable div (aria-roledescription="draggable")
    // which intercepts pointer events. Use force:true to bypass the interception
    // and still trigger the button's onClick handler.
    await firstCard.click({ force: true });

    await expect(page.getByRole("button", { name: "Toggle info" })).toBeVisible(
      { timeout: 10_000 },
    );

    // ── 4. Resize separator exists ──────────────────────────────────────────
    const handle = page.getByRole("separator", { name: "Resize preview" });
    await expect(handle).toBeVisible();

    // ── 5. Drag the handle left by ~100px; rail must still be visible ────────
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width / 2 - 100,
        box.y + box.height / 2,
        { steps: 10 },
      );
      await page.mouse.up();
    }

    // Rail must still be intact after the resize drag.
    await expect(page.getByText("Smart groups")).toBeVisible();
  });
});
