import { expect, test } from "@playwright/test";

test.describe("AI Chat Widget - Real Westfield Query", () => {
  test(
    "submits a real project-status question and receives a non-error response",
    async ({ page }) => {
      const prompt =
        "Tell me about the Westfield collective project status. Are there any concerns or issues?";

      await page.goto("/docs");
      await page.waitForLoadState("networkidle");

      const chatButton = page.locator('button[aria-label="Open chat"]');
      await expect(chatButton).toBeVisible({ timeout: 20000 });
      await chatButton.click();

      const simpleChat = page.locator('[data-testid="simple-rag-chat"]');
      await expect(simpleChat).toBeVisible({ timeout: 15000 });

      const editor = simpleChat.locator("textarea").first();
      await expect(editor).toBeVisible({ timeout: 15000 });
      await editor.fill(prompt);
      await editor.press("Enter");

      await expect(simpleChat.getByText(prompt)).toBeVisible({ timeout: 15000 });

      const assistantBubbleText = simpleChat
        .locator("div.bg-muted.text-foreground p")
        .last();
      await expect(assistantBubbleText).toBeVisible({ timeout: 120000 });

      const responseText = (await assistantBubbleText.textContent())?.trim() ?? "";
      // eslint-disable-next-line no-console
      console.log("Assistant response:", responseText);
      expect(responseText.length).toBeGreaterThan(20);
      expect(responseText.toLowerCase()).not.toContain("request failed");
      expect(responseText.toLowerCase()).not.toContain("demo mode");
      expect(responseText.toLowerCase()).not.toContain("offline");

      await page.screenshot({
        path: "tests/screenshots/chat-westfield-realtime.png",
        fullPage: true,
      });
    },
    180000,
  );
});
