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

test("Focus Relay turns human focus into one atomic, reversible WebMCP intent", async ({ page }) => {
  const errors = await openBoard(page);
  const summary = await callTool(page, "summarize_board") as { total: number; overdue: unknown[]; dueSoon: unknown[] };
  expect(summary.total).toBe(5);
  expect(Array.isArray(summary.overdue)).toBeTruthy();
  expect(Array.isArray(summary.dueSoon)).toBeTruthy();

  const noTarget = await callTool(page, "get_current_card") as { ok: boolean; reason: string };
  expect(noTarget).toMatchObject({ ok: false, reason: "no_target" });

  const card = page.locator(".card").filter({ hasText: "Ship dark mode toggle" });
  await card.focus();
  await expect(card).toHaveAttribute("data-agent-target", "true");
  await expect(page.getByLabel("Focus Relay human-agent handoff")).toContainText("Ship dark mode toggle");

  // Moving focus to agent chat must not lose the human's deliberately chosen context.
  await page.locator(".activity-list").focus();
  const current = await callTool(page, "get_current_card") as { ok: boolean; title: string; column: string };
  expect(current).toMatchObject({ ok: true, title: "Ship dark mode toggle", column: "To Do" });

  const updated = await callTool(page, "update_current_card", {
    column: "In Progress",
    assignee: "Sam",
    priority: "urgent",
    due_date: "2026-09-02",
  }) as { ok: boolean; undo_scope: string; changes: Array<{ field: string }> };

  expect(updated.ok).toBeTruthy();
  expect(updated.undo_scope).toBe("entire_intent");
  expect(updated.changes.map((change) => change.field).sort()).toEqual(["Assignee", "Column", "Due date", "Priority"]);
  const movedCard = page.getByLabel("In Progress column").locator(".card").filter({ hasText: "Ship dark mode toggle" });
  await expect(movedCard).toContainText("@Sam");
  await expect(movedCard).toContainText("2026-09-02");
  await expect(movedCard.getByLabel("Priority of Ship dark mode toggle")).toHaveValue("urgent");
  await expect(movedCard).toHaveAttribute("data-agent-target", "true");

  const receipt = page.locator(".activity-entry").filter({ hasText: "update_current_card" });
  await expect(receipt.locator("dt").filter({ hasText: "Column" })).toBeVisible();
  await expect(receipt).toContainText("To Do");
  await expect(receipt).toContainText("In Progress");

  await page.getByRole("button", { name: "Undo last agent action" }).click();
  const restored = page.getByLabel("To Do column").locator(".card").filter({ hasText: "Ship dark mode toggle" });
  await expect(restored).toContainText("@Alex");
  await expect(restored).toContainText("2026-08-28");
  await expect(restored.getByLabel("Priority of Ship dark mode toggle")).toHaveValue("high");
  await expect(page.getByLabel("In Progress column").getByText("Ship dark mode toggle")).toHaveCount(0);
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

test("human can visibly undo an agent change without overwriting newer human work", async ({ page }) => {
  const errors = await openBoard(page);
  const undoButton = page.getByRole("button", { name: "Undo last agent action" });

  await expect(page.getByText("Move this to In Progress, assign Sam", { exact: false })).toBeVisible();
  await expect(undoButton).toBeDisabled();

  const created = await callTool(page, "create_card", { title: "Undo from the activity panel" }) as {
    card_id: string;
  };
  const createdCard = page.locator(`[data-card-id="${created.card_id}"]`);
  await expect(createdCard).toBeVisible();
  await createdCard.focus();
  await expect(createdCard).toHaveAttribute("data-agent-target", "true");
  await expect(undoButton).toBeEnabled();

  await undoButton.click();
  await expect(createdCard).toHaveCount(0);
  await expect(page.getByLabel("Focus Relay human-agent handoff")).toContainText("Focus any card");
  await expect(page.getByRole("status", { name: "Undo result" })).toHaveText("Undid the latest agent change.");
  await expect(undoButton).toBeDisabled();

  await callTool(page, "create_card", { title: "Preserve this agent card" });
  const humanCard = page.locator(".card").filter({ hasText: "Audit color contrast on settings page" });
  await humanCard.getByLabel("Priority of Audit color contrast on settings page").selectOption("urgent");
  await undoButton.click();

  await expect(page.getByRole("heading", { name: "Preserve this agent card" })).toBeVisible();
  await expect(humanCard.getByLabel("Priority of Audit color contrast on settings page")).toHaveValue("urgent");
  await expect(page.getByRole("status", { name: "Undo result" })).toHaveText(
    "Undo blocked: newer human work was preserved.",
  );
  expect(errors).toEqual([]);
});

test("deleting the focused card clears stale Focus Relay context", async ({ page }) => {
  const errors = await openBoard(page);
  const card = page.locator(".card").filter({ hasText: "Write keyboard nav docs" });
  await card.focus();
  const selected = await callTool(page, "get_current_card") as { ok: boolean; title: string };
  expect(selected).toMatchObject({ ok: true, title: "Write keyboard nav docs" });

  await callTool(page, "delete_card", { card_title: "Write keyboard nav docs" });
  await expect(page.getByLabel("Focus Relay human-agent handoff")).toContainText("Focus any card");
  const stale = await callTool(page, "update_current_card", { priority: "urgent" }) as { ok: boolean; reason: string };
  expect(stale).toMatchObject({ ok: false, reason: "no_target" });
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
