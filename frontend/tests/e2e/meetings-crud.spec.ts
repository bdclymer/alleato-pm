import { test, expect } from "@playwright/test";
import {
  addProjectMember,
  createMeeting,
  createProject,
  deleteMeetingsByProject,
  getUserIdByEmail,
  listMeetingsForProject,
} from "../helpers/db";
import { cleanupProjectArtifacts } from "../helpers/cleanup";

const testUserEmail =
  process.env.PLAYWRIGHT_TEST_USER_EMAIL ?? "test1@mail.com";

let projectId: number;
let testUserId: string;

test.describe("Meetings CRUD", () => {
  test.beforeAll(async () => {
    testUserId = await getUserIdByEmail(testUserEmail);
    projectId = await createProject(`E2E Meetings CRUD ${Date.now()}`);
    await addProjectMember(projectId, testUserId, "admin");
  });

  test.afterAll(async () => {
    if (projectId) {
      await cleanupProjectArtifacts(projectId);
    }
  });

  test.beforeEach(async () => {
    await deleteMeetingsByProject(projectId);
  });

  // ── CREATE: Full form workflow ──────────────────────────────────
  test("should create a new meeting filling ALL form fields", async ({
    page,
  }) => {
    await page.goto(`/${projectId}/meetings`);
    await page.waitForLoadState("domcontentloaded");

    // Verify page loaded
    await expect(
      page.getByRole("heading", { name: "Meetings", exact: true })
    ).toBeVisible({ timeout: 15000 });

    // Click Create Meeting button
    await page.getByRole("button", { name: /create meeting/i }).click();

    // Wait for dialog to appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill title (required)
    await page.locator("#create-title").fill("E2E Full Create Test");

    // Fill date
    await page.locator("#create-date").fill("2026-03-15");

    // Fill duration
    await page.locator("#create-duration").fill("90");

    // Select category/type via Radix Select component
    await page.locator("#create-category").click();
    await page.waitForTimeout(300);
    await page.getByRole("option", { name: "OAC Meeting" }).click();
    await page.waitForTimeout(300);

    // Fill participants
    await page
      .locator("#create-participants")
      .fill("Alice, Bob, Charlie, Dave");

    // Select access level via Radix Select component
    await page.locator("#create-access").click();
    await page.waitForTimeout(300);
    await page.getByRole("option", { name: "Public" }).click();
    await page.waitForTimeout(300);

    // Fill description
    await page
      .locator("#create-description")
      .fill("Quarterly review with all stakeholders");

    // Submit the form
    await page.getByRole("button", { name: /^create meeting$/i }).click();

    // Wait for dialog to close (indicates success)
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Verify success toast
    await expect(page.getByText(/meeting created/i)).toBeVisible({
      timeout: 5000,
    });

    // Verify the meeting appears in the table (page refreshes via router.refresh)
    await expect(page.getByText("E2E Full Create Test")).toBeVisible({
      timeout: 15000,
    });

    // Verify data persisted in the database with all fields
    const meetings = await listMeetingsForProject(projectId);
    const created = meetings.find((m) => m.title === "E2E Full Create Test");
    expect(created).toBeTruthy();
    expect(created!.participants).toBe("Alice, Bob, Charlie, Dave");
    expect(created!.category).toBe("OAC Meeting");
    expect(created!.access_level).toBe("public");
    expect(created!.duration_minutes).toBe(90);
  });

  // ── READ: Verify seeded meeting data renders in table ──────────
  test("should display seeded meeting data correctly in the table", async ({
    page,
  }) => {
    // Seed two meetings with distinct data
    await createMeeting(projectId, "Design Review Session", {
      date: "2026-02-01T14:00:00Z",
      participants: "Designer, PM",
      category: "Design Review",
    });
    await createMeeting(projectId, "Sprint Planning", {
      date: "2026-02-02T09:00:00Z",
      participants: "Team Lead, Dev1, Dev2",
      category: "Internal Meeting",
    });

    await page.goto(`/${projectId}/meetings`);
    await page.waitForLoadState("domcontentloaded");

    // Verify both meetings appear in table by title
    await expect(page.getByText("Design Review Session")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Sprint Planning")).toBeVisible();

    // Verify date column renders correctly (format: "MMM d, yyyy")
    await expect(page.getByText("Feb 1, 2026")).toBeVisible();
    await expect(page.getByText("Feb 2, 2026")).toBeVisible();

    // Verify participants column shows count (2 people, 3 people)
    await expect(page.getByText("2 people")).toBeVisible();
    await expect(page.getByText("3 people")).toBeVisible();

    // Verify the statistics header
    await expect(page.getByText(/2 total meetings/i)).toBeVisible();
  });

  // ── READ: Meetings list page header and statistics ─────────────
  test("should display meetings list page with correct header and stats", async ({
    page,
  }) => {
    // Seed a meeting for this test
    await createMeeting(projectId, "Weekly Standup", {
      date: "2026-02-03T10:00:00Z",
      participants: "Alice, Bob",
      category: "Internal Meeting",
    });

    await page.goto(`/${projectId}/meetings`);
    await page.waitForLoadState("domcontentloaded");

    // Verify page header
    await expect(
      page.getByRole("heading", { name: "Meetings" })
    ).toBeVisible({ timeout: 15000 });

    // Verify the Create Meeting button is present
    await expect(
      page.getByRole("button", { name: /create meeting/i })
    ).toBeVisible();

    // Verify meeting statistics are shown
    await expect(page.getByText(/1 total meetings/i)).toBeVisible();
  });

  // ── EDIT: Open edit modal, change fields, save ─────────────────
  test("should edit a meeting via the actions menu", async ({ page }) => {
    // Seed a meeting to edit
    await createMeeting(projectId, "Meeting to Edit", {
      date: "2026-02-10T10:00:00Z",
      participants: "Alice, Bob",
      category: "Internal Meeting",
    });

    await page.goto(`/${projectId}/meetings`);
    await page.waitForLoadState("domcontentloaded");

    // Verify the meeting is visible
    await expect(page.getByText("Meeting to Edit")).toBeVisible({
      timeout: 15000,
    });

    // Find the row with the meeting and click the actions (three-dot) button
    const row = page.locator("tr", { hasText: "Meeting to Edit" });
    const actionsButton = row.getByRole("button", { name: /open menu/i });
    await actionsButton.click();

    // Click "Edit meeting" from the dropdown
    const editMenuItem = page.getByRole("menuitem", {
      name: /edit meeting/i,
    });
    await expect(editMenuItem).toBeVisible({ timeout: 3000 });
    await editMenuItem.click();

    // Wait for the edit dialog to appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify dialog title
    await expect(
      page.getByRole("heading", { name: /edit meeting/i })
    ).toBeVisible();

    // Change the title
    const titleInput = dialog.locator("#title");
    await titleInput.clear();
    await titleInput.fill("Updated Meeting Title");

    // Change participants
    const participantsInput = dialog.locator("#participants");
    await participantsInput.clear();
    await participantsInput.fill("Alice, Bob, Charlie");

    // Scroll down within the dialog to reach Save changes button
    // The dialog content may overflow the viewport, so scroll the dialog container
    const dialogContent = dialog.locator('[class*="DialogContent"], [role="dialog"]').first();
    await dialogContent.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(300);

    // Click Save changes with force since dialog may not scroll properly
    const saveButton = page.getByRole("button", { name: /save changes/i });
    await saveButton.click({ force: true });

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Verify the page refreshes and shows updated title
    // The edit modal uses direct Supabase update + router.refresh()
    await expect(page.getByText("Updated Meeting Title")).toBeVisible({
      timeout: 15000,
    });

    // Verify data persisted in database
    const meetings = await listMeetingsForProject(projectId);
    const updated = meetings.find(
      (m) => m.title === "Updated Meeting Title"
    );
    expect(updated).toBeTruthy();
    expect(updated!.participants).toBe("Alice, Bob, Charlie");
  });

  // ── DELETE: Delete a meeting via API and verify it disappears ──
  test("should delete a meeting and verify it disappears", async ({
    page,
  }) => {
    // Seed a meeting to delete
    const meeting = await createMeeting(projectId, "Meeting to Delete", {
      date: "2026-02-03T10:00:00Z",
      participants: "Alice",
    });

    await page.goto(`/${projectId}/meetings`);
    await page.waitForLoadState("domcontentloaded");

    // Verify the meeting is visible
    await expect(page.getByText("Meeting to Delete")).toBeVisible({
      timeout: 15000,
    });

    // Delete via API (the UI does not have a delete button in the dropdown)
    const deleteResponse = await page.request.delete(
      `/api/projects/${projectId}/meetings/${meeting.id}`
    );
    expect(deleteResponse.ok()).toBeTruthy();

    // Reload page to reflect deletion
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Verify the meeting no longer appears
    await expect(page.getByText("Meeting to Delete")).not.toBeVisible({
      timeout: 10000,
    });

    // Verify in database
    const meetings = await listMeetingsForProject(projectId);
    const deleted = meetings.find((m) => m.id === meeting.id);
    expect(deleted).toBeUndefined();
  });

  // ── VALIDATION: Empty title shows error ────────────────────────
  test("should show validation error for empty title", async ({ page }) => {
    await page.goto(`/${projectId}/meetings`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for page header to appear
    await expect(
      page.getByRole("heading", { name: "Meetings", exact: true })
    ).toBeVisible({ timeout: 15000 });

    // Open the create dialog
    await page.getByRole("button", { name: /create meeting/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Submit without filling in the title
    await page.getByRole("button", { name: /^create meeting$/i }).click();

    // The dialog should still be open (form didn't submit)
    await expect(dialog).toBeVisible();

    // Verify validation error appears
    await expect(page.getByText(/title is required/i)).toBeVisible();
  });

  // ── DETAIL PAGE: Navigate to meeting detail, verify display ────
  test("should navigate to meeting detail page and verify content", async ({
    page,
  }) => {
    // Seed a meeting with detailed data
    const meeting = await createMeeting(projectId, "Detailed Meeting View", {
      date: "2026-02-20T15:00:00Z",
      participants: "Alice, Bob, Charlie",
      category: "OAC Meeting",
    });

    await page.goto(`/${projectId}/meetings`);
    await page.waitForLoadState("domcontentloaded");

    // Verify the meeting is visible in the table
    await expect(page.getByText("Detailed Meeting View")).toBeVisible({
      timeout: 15000,
    });

    // Click on the meeting title link to navigate to detail page
    await page.getByText("Detailed Meeting View").click();
    await page.waitForLoadState("domcontentloaded");

    // Verify we're on the detail page - check for the meeting title in the header
    await expect(
      page.getByRole("heading", { name: "Detailed Meeting View" })
    ).toBeVisible({ timeout: 15000 });

    // Verify breadcrumbs are present
    await expect(page.getByText("Meetings").first()).toBeVisible();

    // Verify the date displays
    await expect(page.getByText(/February 20, 2026/)).toBeVisible();

    // Verify participants/attendees are shown
    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByText("Bob")).toBeVisible();
    await expect(page.getByText("Charlie")).toBeVisible();
  });
});
