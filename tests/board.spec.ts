import { expect, test } from "@playwright/test";
import { callTool, openBoard, seriousAxeViolations } from "./helpers";

test("human can create, cancel, edit, and safely delete a complete card", async ({ page }) => {
  const errors = await openBoard(page);

  await page.getByRole("button", { name: "Add card to Backlog" }).click();
  const editor = page.getByRole("dialog", { name: "Create card" });
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel("Title")).toBeFocused();
  await editor.getByRole("button", { name: "Create card" }).click();
  await expect(editor.getByRole("alert")).toHaveText("Enter a card title.");

  await editor.getByLabel("Title").fill("Keyboard-ready release notes");
  await editor.getByLabel("Description").fill("Document the complete keyboard flow.");
  await editor.getByLabel("Assignee").fill("Morgan");
  await editor.getByLabel("Due date").fill("2026-09-15");
  await editor.getByLabel("Priority").selectOption("high");
  await editor.getByRole("button", { name: "Create card" }).click();

  const card = page.locator(".card").filter({ hasText: "Keyboard-ready release notes" });
  await expect(card).toBeVisible();
  await expect(card).toBeFocused();
  await expect(card).toContainText("Document the complete keyboard flow.");
  await expect(card).toContainText("@Morgan");
  await expect(card).toContainText("2026-09-15");

  await card.getByRole("button", { name: "Edit Keyboard-ready release notes" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit card" });
  await editDialog.getByLabel("Title").fill("Discard this change");
  await page.keyboard.press("Escape");
  await expect(editDialog).toBeHidden();
  await expect(card).toContainText("Keyboard-ready release notes");
  await expect(card).toBeFocused();

  await card.getByRole("button", { name: "Edit Keyboard-ready release notes" }).click();
  await editDialog.getByLabel("Title").fill("Keyboard release notes");
  await editDialog.getByLabel("Assignee").fill("Taylor");
  await editDialog.getByLabel("Priority").selectOption("urgent");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  const editedCard = page.locator(".card").filter({ hasText: "Keyboard release notes" });
  await expect(editedCard).toContainText("@Taylor");
  await expect(editedCard).toBeFocused();

  await editedCard.getByRole("button", { name: "Delete Keyboard release notes" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete this card?" });
  await expect(confirm.getByRole("button", { name: "Keep card" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(editedCard).toBeVisible();
  await expect(editedCard).toBeFocused();

  await editedCard.getByRole("button", { name: "Delete Keyboard release notes" }).click();
  await confirm.getByRole("button", { name: "Delete card" }).click();
  await expect(editedCard).toHaveCount(0);
  await expect(page.locator("#main-board > .sr-only")).toContainText("deleted from Backlog");
  expect(errors).toEqual([]);
});

test("README journey works through registered WebMCP tools", async ({ page }) => {
  const errors = await openBoard(page);
  const summary = await callTool(page, "summarize_board") as { total: number; overdue: unknown[]; dueSoon: unknown[] };
  expect(summary.total).toBe(5);
  expect(Array.isArray(summary.overdue)).toBeTruthy();
  expect(Array.isArray(summary.dueSoon)).toBeTruthy();

  const moved = await callTool(page, "move_card", { card_title: "Ship dark mode toggle", column: "In Progress" }) as { ok: boolean };
  const prioritized = await callTool(page, "set_priority", { card_title: "Ship dark mode toggle", priority: "urgent" }) as { ok: boolean };
  const created = await callTool(page, "create_card", {
    title: "A11y audit of settings page",
    assignee: "Sam",
    due_date: "2026-09-04",
  }) as { ok: boolean; card_id: string };

  expect(moved.ok).toBeTruthy();
  expect(prioritized.ok).toBeTruthy();
  expect(created.ok).toBeTruthy();
  await expect(page.locator(`[data-card-id="${created.card_id}"]`)).toContainText("@Sam");
  await expect(page.locator(`[data-card-id="${created.card_id}"]`)).toContainText("2026-09-04");
  await expect(page.getByLabel("In Progress column").getByText("Ship dark mode toggle")).toBeVisible();
  await expect(page.getByLabel("Priority of Ship dark mode toggle")).toHaveValue("urgent");
  expect(errors).toEqual([]);
});

test("keyboard movement retains focus and human work blocks unsafe agent undo", async ({ page }) => {
  const errors = await openBoard(page);
  const card = page.locator(".card").filter({ hasText: "Audit color contrast on settings page" });
  await card.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("To Do column").getByText("Audit color contrast on settings page")).toBeVisible();
  await expect(card).toBeFocused();

  await callTool(page, "create_card", { title: "Agent checkpoint", column: "todo" });
  await card.getByLabel("Priority of Audit color contrast on settings page").selectOption("urgent");
  const undo = await callTool(page, "undo_last_agent_action") as { ok: boolean; reason: string };
  expect(undo).toMatchObject({ ok: false, reason: "newer_human_changes" });
  await expect(page.getByRole("heading", { name: "Agent checkpoint" })).toBeVisible();
  await expect(card.getByLabel("Priority of Audit color contrast on settings page")).toHaveValue("urgent");
  expect(errors).toEqual([]);
});

test("stale human dialogs resolve safely when an agent deletes the same card", async ({ page }) => {
  const errors = await openBoard(page);
  const title = "Write keyboard nav docs";
  const card = page.locator(".card").filter({ hasText: title });

  await card.getByRole("button", { name: `Edit ${title}` }).click();
  await callTool(page, "delete_card", { card_title: title });
  const editDialog = page.getByRole("dialog", { name: "Edit card" });
  await editDialog.getByLabel("Title").fill("This must not resurrect");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(editDialog).toBeHidden();
  await expect(page.getByText("This must not resurrect")).toHaveCount(0);
  await expect(page.locator("#main-board > .sr-only")).toContainText("no longer on the board");

  const secondTitle = "Audit color contrast on settings page";
  const secondCard = page.locator(".card").filter({ hasText: secondTitle });
  await secondCard.getByRole("button", { name: `Delete ${secondTitle}` }).click();
  await callTool(page, "delete_card", { card_title: secondTitle });
  const deleteDialog = page.getByRole("dialog", { name: "Delete this card?" });
  await deleteDialog.getByRole("button", { name: "Delete card" }).click();
  await expect(deleteDialog).toBeHidden();
  await expect(page.locator("#main-board > .sr-only")).toContainText("already removed");
  expect(errors).toEqual([]);
});

test("initial board and open editor have no serious Axe violations", async ({ page }) => {
  await openBoard(page);
  expect(await seriousAxeViolations(page)).toEqual([]);
  await page.getByRole("button", { name: "Add card to To Do" }).click();
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test("forced colors, reduced motion, and 200% reflow preserve the editor", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Forced-colors emulation is a Chromium release gate.");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 640, height: 360 });
  await openBoard(page);
  await page.getByRole("button", { name: "Add card to Backlog" }).click();
  const dialog = page.getByRole("dialog", { name: "Create card" });
  await expect(dialog).toBeInViewport();
  const createButton = dialog.getByRole("button", { name: "Create card" });
  let reachedCreate = false;
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press("Tab");
    reachedCreate = await createButton.evaluate((button) => button === document.activeElement);
    if (reachedCreate) break;
  }
  expect(reachedCreate).toBeTruthy();
  await expect(createButton).toBeInViewport();
  expect(await seriousAxeViolations(page)).toEqual([]);
});
