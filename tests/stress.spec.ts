import { expect, test } from "@playwright/test";
import { callTool, openBoard, seriousAxeViolations } from "./helpers";

test("5,000 deterministic mutations preserve board and accessibility invariants", async ({ page }) => {
  test.setTimeout(360_000);
  const errors = await openBoard(page);

  await Promise.all(Array.from({ length: 100 }, (_, index) => callTool(page, "create_card", {
    title: `Soak card ${index.toString().padStart(3, "0")}`,
    column: ["backlog", "todo", "in-progress", "done"][index % 4],
    assignee: `Person ${index % 9}`,
    due_date: `2026-09-${((index % 28) + 1).toString().padStart(2, "0")}`,
    priority: ["low", "medium", "high", "urgent"][index % 4],
  })));

  const soak = await page.evaluate(async () => {
    const context = (window as unknown as {
      __testModelContext: { registrations: Map<string, { execute: (value: unknown) => Promise<unknown> }> };
    }).__testModelContext;
    const call = (name: string, input: unknown) => context.registrations.get(name)!.execute(input);
    const ids = [...document.querySelectorAll<HTMLElement>("[data-card-id]")].map((node) => node.dataset.cardId!);
    const columns = ["backlog", "todo", "in-progress", "done"];
    const priorities = ["low", "medium", "high", "urgent"];
    let seed = 0x5eed1234;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };

    for (let index = 0; index < 5_000; index++) {
      const card_id = ids[Math.floor(random() * ids.length)];
      const operation = index % 5;
      if (operation === 0) await call("move_card", { card_id, column: columns[Math.floor(random() * columns.length)] });
      if (operation === 1) await call("set_priority", { card_id, priority: priorities[Math.floor(random() * priorities.length)] });
      if (operation === 2) await call("assign_card", { card_id, assignee: `Soak ${Math.floor(random() * 20)}` });
      if (operation === 3) await call("set_due_date", { card_id, due_date: `2026-10-${(Math.floor(random() * 28) + 1).toString().padStart(2, "0")}` });
      if (operation === 4) await call("edit_card", { card_id, description: `Mutation ${index}` });
    }
    return { operations: 5_000, ids: ids.length };
  });

  await expect(page.locator(".card")).toHaveCount(105);
  const summary = await callTool(page, "summarize_board") as { total: number; columns: Array<{ count: number }> };
  expect(summary.total).toBe(105);
  expect(summary.columns.reduce((total, column) => total + column.count, 0)).toBe(105);
  expect(soak).toEqual({ operations: 5_000, ids: 105 });
  expect(await page.locator("[data-card-id]").evaluateAll((nodes) => new Set(nodes.map((node) => (node as HTMLElement).dataset.cardId)).size)).toBe(105);
  await expect(page.locator(".activity-entry")).toHaveCount(200);
  expect(await seriousAxeViolations(page)).toEqual([]);
  expect(errors).toEqual([]);
});
