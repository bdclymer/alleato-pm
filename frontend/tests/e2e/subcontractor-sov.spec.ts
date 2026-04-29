import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test.use({ storageState: { cookies: [], origins: [] } });

const projectId = Number(process.env.SUBCONTRACTOR_SOV_TEST_PROJECT_ID);
const commitmentId = process.env.SUBCONTRACTOR_SOV_TEST_COMMITMENT_ID;
const subcontractorEmail = process.env.SUBCONTRACTOR_SOV_TEST_EMAIL;
const subcontractorPassword = process.env.SUBCONTRACTOR_SOV_TEST_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const shouldRun =
  Number.isFinite(projectId) &&
  !!commitmentId &&
  !!subcontractorEmail &&
  !!subcontractorPassword &&
  !!supabaseUrl &&
  !!serviceRoleKey;

test.describe("subcontractor SOV submission", () => {
  test.skip(!shouldRun, "Set SUBCONTRACTOR_SOV_TEST_* env vars to run this external-user flow.");

  test("subcontractor can find, save, and submit their assigned SOV", async ({ page }) => {
    const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false },
    });

    const { data: submission, error: submissionError } = await supabase
      .from("subcontractor_sov_submissions")
      .select("id")
      .eq("project_id", projectId)
      .eq("commitment_id", commitmentId)
      .single();
    expect(submissionError).toBeNull();
    expect(submission?.id).toBeTruthy();

    await supabase
      .from("subcontractor_sov_items")
      .delete()
      .eq("submission_id", submission!.id);
    await supabase
      .from("subcontractor_sov_submissions")
      .update({
        status: "draft",
        submitted_at: null,
        submitted_by: null,
        reviewed_at: null,
        reviewed_by: null,
        review_notes: null,
      })
      .eq("id", submission!.id);

    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(subcontractorEmail!);
    await page.getByRole("textbox", { name: "Password" }).fill(subcontractorPassword!);
    await page.getByRole("button", { name: /^login$/i }).click();

    await expect(page.getByText(/login successful/i)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${projectId}/my-work`), {
      timeout: 60_000,
    });
    await expect(page.getByRole("heading", { name: "Schedule of Values" })).toBeVisible();
    await expect(page.getByRole("link", { name: /SC-1010-001/i })).toBeVisible();

    await page.getByRole("link", { name: /SC-1010-001/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${projectId}/commitments/${commitmentId}`));
    await expect(page.getByText("Subcontractor Schedule of Values")).toBeVisible();

    await page.getByRole("button", { name: /add line item/i }).click();
    await page.getByPlaceholder("Line item description").fill("Automated SOV breakdown");
    await page.getByLabel("Amount").fill("200000");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("button", { name: /submit for review/i })).toBeEnabled();

    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Under Review")).toBeVisible();
    await expect(page.getByPlaceholder("Line item description")).toBeDisabled();
  });
});
