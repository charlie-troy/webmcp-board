import { expect, test } from "@playwright/test";
import { callTool, openBoard } from "./helpers";

test("an already-loaded board remains fully usable offline", async ({ page, context }) => {
  const errors = await openBoard(page);
  await context.setOffline(true);

  await page.getByRole("button", { name: "Add card to Done" }).click();
  const dialog = page.getByRole("dialog", { name: "Create card" });
  await dialog.getByLabel("Title").fill("Offline follow-up");
  await dialog.getByRole("button", { name: "Create card" }).click();
  await expect(page.getByRole("heading", { name: "Offline follow-up" })).toBeVisible();

  const summary = await callTool(page, "summarize_board") as { total: number };
  expect(summary.total).toBe(6);
  expect(errors).toEqual([]);
});

test("slow resource delivery still reaches an interactive WebMCP board", async ({ page }) => {
  test.setTimeout(30_000);
  await page.route("**/*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.continue();
  });
  const started = Date.now();
  const errors = await openBoard(page);
  const interactiveMs = Date.now() - started;

  await expect(page.getByRole("button", { name: "Add card to Backlog" })).toBeEnabled();
  expect(interactiveMs).toBeLessThan(15_000);
  expect(errors).toEqual([]);
});

test("100 editor open-cancel cycles preserve focus and do not leak dialogs", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = await openBoard(page);
  const addButton = page.getByRole("button", { name: "Add card to Backlog" });

  for (let index = 0; index < 100; index++) {
    await addButton.click();
    await page.keyboard.press("Escape");
  }

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(addButton).toBeFocused();
  expect(errors).toEqual([]);
});

test("25 cold reloads register exactly one copy of all tools", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = await openBoard(page);

  for (let index = 0; index < 25; index++) {
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => {
      const context = (window as unknown as { __testModelContext?: { registrations: Map<string, unknown> } }).__testModelContext;
      return context?.registrations.size === 12;
    });
  }

  const names = await page.evaluate(() => {
    const context = (window as unknown as { __testModelContext: { registrations: Map<string, unknown> } }).__testModelContext;
    return [...context.registrations.keys()];
  });
  expect(new Set(names).size).toBe(12);
  expect(errors).toEqual([]);
});
