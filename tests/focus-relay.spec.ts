import { expect, test } from "@playwright/test";
import { callTool, openBoard, seriousAxeViolations } from "./helpers";

test("rapid human focus handoffs target only the most recent card", async ({ page }) => {
  const errors = await openBoard(page);
  const contrast = page.locator(".card").filter({ hasText: "Audit color contrast on settings page" });
  const docs = page.locator(".card").filter({ hasText: "Write keyboard nav docs" });

  await contrast.focus();
  await docs.getByLabel("Priority of Write keyboard nav docs").focus();
  const current = await callTool(page, "get_current_card") as { ok: boolean; title: string };
  expect(current).toMatchObject({ ok: true, title: "Write keyboard nav docs" });

  await callTool(page, "update_current_card", { assignee: "Relay owner" });
  await expect(docs).toContainText("@Relay owner");
  await expect(contrast).toContainText("@Sam");

  await page.getByRole("button", { name: "Clear agent target Write keyboard nav docs" }).click();
  const cleared = await callTool(page, "get_current_card") as { ok: boolean; reason: string };
  expect(cleared).toMatchObject({ ok: false, reason: "no_target" });
  expect(errors).toEqual([]);
});

test("invalid and no-op contextual requests never create undo points", async ({ page }) => {
  const errors = await openBoard(page);
  const card = page.locator(".card").filter({ hasText: "Ship dark mode toggle" });
  const undo = page.getByRole("button", { name: "Undo last agent action" });
  await card.focus();

  const noChange = await callTool(page, "update_current_card", {
    assignee: "Alex",
    priority: "high",
    due_date: "2026-08-28",
    column: "To Do",
  }) as { ok: boolean; reason: string };
  expect(noChange).toMatchObject({ ok: false, reason: "no_changes" });
  await expect(undo).toBeDisabled();

  const badColumn = await callTool(page, "update_current_card", { column: "Imaginary" }) as {
    ok: boolean;
    reason: string;
  };
  expect(badColumn).toMatchObject({ ok: false, reason: "column_not_found" });
  await expect(page.locator(".activity-entry.error").filter({ hasText: "Imaginary" })).toBeVisible();
  await expect(undo).toBeDisabled();

  const invalidDate = await page.evaluate(async () => {
    const context = (window as unknown as {
      __testModelContext: { registrations: Map<string, { execute: (value: unknown) => Promise<unknown> }> };
    }).__testModelContext;
    try {
      await context.registrations.get("update_current_card")!.execute({ due_date: "2026-02-30" });
      return { rejected: false, message: "" };
    } catch (error) {
      return { rejected: true, message: error instanceof Error ? error.message : String(error) };
    }
  });
  expect(invalidDate.rejected).toBeTruthy();
  expect(invalidDate.message).toContain("real calendar date");
  await expect(card).toContainText("@Alex");
  await expect(card).toContainText("2026-08-28");
  await expect(card.getByLabel("Priority of Ship dark mode toggle")).toHaveValue("high");
  await expect(undo).toBeDisabled();
  expect(errors).toEqual([]);
});

test("newer human work blocks rollback of an entire agent intent", async ({ page }) => {
  const errors = await openBoard(page);
  const target = page.locator(".card").filter({ hasText: "Ship dark mode toggle" });
  const humanCard = page.locator(".card").filter({ hasText: "Audit color contrast on settings page" });
  await target.focus();

  await callTool(page, "update_current_card", {
    column: "In Progress",
    assignee: "Sam",
    priority: "urgent",
    due_date: "2026-09-02",
  });
  await humanCard.getByLabel("Priority of Audit color contrast on settings page").selectOption("urgent");
  await page.getByRole("button", { name: "Undo last agent action" }).click();

  const moved = page.getByLabel("In Progress column").locator(".card").filter({ hasText: "Ship dark mode toggle" });
  await expect(moved).toContainText("@Sam");
  await expect(moved).toContainText("2026-09-02");
  await expect(moved.getByLabel("Priority of Ship dark mode toggle")).toHaveValue("urgent");
  await expect(humanCard.getByLabel("Priority of Audit color contrast on settings page")).toHaveValue("urgent");
  await expect(page.getByRole("status", { name: "Undo result" })).toHaveText(
    "Undo blocked: newer human work was preserved.",
  );
  expect(errors).toEqual([]);
});

test("target identity survives an atomic rename and move", async ({ page }) => {
  const errors = await openBoard(page);
  const card = page.locator(".card").filter({ hasText: "Write keyboard nav docs" });
  await card.getByRole("button", { name: "Edit Write keyboard nav docs" }).focus();

  const result = await callTool(page, "update_current_card", {
    title: "Publish switch-navigation guide",
    column: "Done",
  }) as { ok: boolean; card_id: string };
  expect(result.ok).toBeTruthy();

  const renamed = page.locator(`[data-card-id="${result.card_id}"]`);
  await expect(renamed).toContainText("Publish switch-navigation guide");
  await expect(renamed).toHaveAttribute("data-agent-target", "true");
  const current = await callTool(page, "get_current_card") as { title: string; column: string };
  expect(current).toMatchObject({ title: "Publish switch-navigation guide", column: "Done" });

  await page.getByRole("button", { name: "Undo last agent action" }).click();
  const restored = page.locator(`[data-card-id="${result.card_id}"]`);
  await expect(restored).toContainText("Write keyboard nav docs");
  await expect(restored).toHaveAttribute("data-agent-target", "true");
  expect(errors).toEqual([]);
});

test("focused target and semantic receipt remain accessible", async ({ page }) => {
  const errors = await openBoard(page);
  await page.locator(".card").filter({ hasText: "Ship dark mode toggle" }).focus();
  await callTool(page, "update_current_card", { assignee: "Sam", priority: "urgent" });

  expect(await seriousAxeViolations(page)).toEqual([]);
  await expect(page.getByRole("log", { name: "Agent activity entries" })).toContainText("One Undo restores all 2 changes");
  expect(errors).toEqual([]);
});

test("Focus Relay remains operable in a narrow touch viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openBoard(page);
  const card = page.locator(".card").filter({ hasText: "Ship dark mode toggle" });
  await card.focus();

  const clear = page.getByRole("button", { name: "Clear agent target Ship dark mode toggle" });
  await expect(clear).toBeVisible();
  await expect(clear).toHaveCSS("font-size", "0px");
  await clear.click();
  await expect(page.getByLabel("Focus Relay human-agent handoff")).toContainText("Focus any card");
  expect(await seriousAxeViolations(page)).toEqual([]);
  expect(errors).toEqual([]);
});
