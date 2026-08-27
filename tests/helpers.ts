import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

export const axeSource = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");

export async function openBoard(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  await page.addInitScript(() => {
    const registrations = new Map<string, { execute: (input: unknown) => Promise<unknown> }>();
    const modelContext = {
      registrations,
      async registerTool(definition: { name: string; execute: (input: unknown) => Promise<unknown> }) {
        registrations.set(definition.name, definition);
        return { id: `test_${definition.name}` };
      },
      async unregisterTool(name: string) {
        return registrations.delete(name);
      },
      async getTools() {
        return [...registrations.keys()];
      },
    };
    Object.defineProperty(document, "modelContext", { configurable: true, value: modelContext });
    Object.defineProperty(window, "__testModelContext", { configurable: true, value: modelContext });
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator(".mcp-badge").waitFor();
  await page.waitForFunction(() => {
    const context = (window as unknown as { __testModelContext?: { registrations: Map<string, unknown> } }).__testModelContext;
    return context?.registrations.size === 10;
  });
  return errors;
}

export async function callTool(page: Page, name: string, input: Record<string, unknown> = {}) {
  return page.evaluate(
    async ({ toolName, args }) => {
      const context = (window as unknown as {
        __testModelContext: { registrations: Map<string, { execute: (value: unknown) => Promise<unknown> }> };
      }).__testModelContext;
      const tool = context.registrations.get(toolName);
      if (!tool) throw new Error(`Missing tool: ${toolName}`);
      return tool.execute(args);
    },
    { toolName: name, args: input },
  );
}

export async function seriousAxeViolations(page: Page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: () => Promise<{ violations: Array<{
        id: string;
        impact: string | null;
        nodes: Array<{ target: unknown; failureSummary?: string }>;
      }> }> };
    }).axe;
    const result = await axe.run();
    return result.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
        samples: violation.nodes.slice(0, 3).map((node) => ({ target: node.target, summary: node.failureSummary })),
      }));
  });
}
