/**
 * Agent Hands Task Board — WebMCP tool catalog.
 *
 * Every physical manipulation and form interaction a human can perform has an
 * equivalent tool, so motor-impaired users can delegate the physical
 * manipulation to their agent while keeping full visibility and control.
 */
import { z } from "zod";
import { registerTool, type ToolDefinition } from "./modelContext";
import { useBoard } from "../state/store";
import { PRIORITIES, type Priority } from "../state/boardStore";

const columnRef = z
  .string()
  .describe("Column id or title: 'backlog', 'todo', 'in-progress', 'done' (case-insensitive).");

const cardRef = z.object({
  card_id: z.string().optional().describe("Card id (preferred). Get ids from search_cards or summarize_board."),
  card_title: z.string().optional().describe("Card title to match if the id is unknown (case-insensitive, must be unique)."),
});

interface FoundCard {
  card: import("../state/boardStore").Card;
  column: import("../state/boardStore").Column;
}

function resolveCard(input: { card_id?: string; card_title?: string }): FoundCard | null {
  const { board } = useBoard.getState();
  if (input.card_id) {
    for (const column of board.columns) {
      const card = column.cards.find((c) => c.id === input.card_id);
      if (card) return { card, column };
    }
  }
  if (input.card_title) {
    const q = input.card_title.toLowerCase();
    const matches: FoundCard[] = [];
    for (const column of board.columns) {
      for (const card of column.cards) {
        if (card.title.toLowerCase() === q || card.title.toLowerCase().includes(q)) {
          matches.push({ card, column });
        }
      }
    }
    if (matches.length === 1) return matches[0];
  }
  return null;
}

export async function registerAllTools(): Promise<number> {
  const defs: ToolDefinition[] = [
    {
      name: "summarize_board",
      description:
        "Get an overview of the board: card counts per column, workload per assignee, priority breakdown, overdue cards, and cards due in the next 7 days. Call this first to understand the board.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
      execute: () => {
        const summary = useBoard.getState().summarizeBoard();
        return {
          summary: `${summary.total} cards across ${summary.columns.length} columns. ${summary.overdue.length} overdue, ${summary.dueSoon.length} due in the next 7 days.`,
          ...summary,
        };
      },
    },
    {
      name: "search_cards",
      description: "Search cards by keyword across title, description, and assignee. Returns matching cards with their ids and columns.",
      inputSchema: z.object({ query: z.string().min(1) }),
      annotations: { readOnlyHint: true, idempotentHint: true },
      execute: ({ query }: { query: string }) => {
        const results = useBoard.getState().searchCards(query);
        return {
          summary: results.length === 0 ? `No cards matching "${query}".` : `Found ${results.length} card(s) matching "${query}".`,
          matches: results.map((r) => ({
            card_id: r.card.id,
            title: r.card.title,
            assignee: r.card.assignee,
            due_date: r.card.dueDate,
            priority: r.card.priority,
            column: r.column,
          })),
        };
      },
    },
    {
      name: "create_card",
      description: "Create a new card. Optionally set column, assignee, due date (YYYY-MM-DD), and priority.",
      inputSchema: z.object({
        title: z.string().min(1).max(140),
        description: z.string().max(1000).optional(),
        column: columnRef.optional(),
        assignee: z.string().max(60).optional(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Due date as YYYY-MM-DD, or omit."),
        priority: z.enum(["low", "medium", "high", "urgent"] as [Priority, ...Priority[]]).optional(),
      }),
      execute: (input: { title: string; description?: string; column?: string; assignee?: string; due_date?: string; priority?: Priority }) => {
        const board = useBoard.getState().board;
        const column = input.column
          ? board.columns.find((c) => c.id === input.column || c.title.toLowerCase() === input.column?.toLowerCase())
          : board.columns[0];
        if (!column) return { summary: `Column "${input.column}" not found.`, ok: false };
        const card = useBoard.getState().createCard(
          {
            title: input.title,
            description: input.description,
            assignee: input.assignee,
            dueDate: input.due_date,
            priority: input.priority,
            columnId: column.id,
          },
          "agent",
        );
        return { summary: `Created "${card.title}" in ${column.title}.`, ok: true, card_id: card.id };
      },
    },
    {
      name: "move_card",
      description:
        "Move a card to another column (e.g. from 'todo' to 'in-progress'). Optionally place it at a specific 0-based position in that column.",
      inputSchema: cardRef.extend({
        column: columnRef,
        position: z.number().int().min(0).optional().describe("0-based position in the destination column; defaults to the end."),
      }),
      execute: (input: { card_id?: string; card_title?: string; column: string; position?: number }) => {
        const found = resolveCard(input);
        if (!found) return { summary: "Card not found — use search_cards to get ids.", ok: false };
        const ok = useBoard.getState().moveCard(found.card.id, input.column, input.position, "agent");
        const column = useBoard.getState().resolveColumn(input.column);
        return ok
          ? { summary: `Moved "${found.card.title}" to ${column.title}.`, ok: true }
          : { summary: `Column "${input.column}" not found.`, ok: false };
      },
    },
    {
      name: "edit_card",
      description: "Edit a card's title and/or description.",
      inputSchema: cardRef.extend({
        title: z.string().min(1).max(140).optional(),
        description: z.string().max(1000).optional(),
      }),
      execute: (input: { card_id?: string; card_title?: string; title?: string; description?: string }) => {
        const found = resolveCard(input);
        if (!found) return { summary: "Card not found.", ok: false };
        const ok = useBoard.getState().editCard(
          found.card.id,
          { title: input.title, description: input.description },
          "agent",
        );
        return ok ? { summary: `Updated "${found.card.title}".`, ok: true } : { summary: "Nothing to update.", ok: false };
      },
    },
    {
      name: "assign_card",
      description: "Assign a card to a person (or clear with an empty string).",
      inputSchema: cardRef.extend({ assignee: z.string().max(60) }),
      execute: (input: { card_id?: string; card_title?: string; assignee: string }) => {
        const found = resolveCard(input);
        if (!found) return { summary: "Card not found.", ok: false };
        const ok = useBoard.getState().assignCard(found.card.id, input.assignee, "agent");
        return ok
          ? { summary: `"${found.card.title}" assigned to ${input.assignee || "nobody"}.`, ok: true }
          : { summary: "Card not found.", ok: false };
      },
    },
    {
      name: "set_due_date",
      description: "Set a card's due date (YYYY-MM-DD), or clear it with an empty string.",
      inputSchema: cardRef.extend({
        due_date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).describe("YYYY-MM-DD, or empty string to clear."),
      }),
      execute: (input: { card_id?: string; card_title?: string; due_date: string }) => {
        const found = resolveCard(input);
        if (!found) return { summary: "Card not found.", ok: false };
        const ok = useBoard.getState().setDueDate(found.card.id, input.due_date, "agent");
        return ok
          ? { summary: `Due date of "${found.card.title}" set to ${input.due_date || "(none)"}.`, ok: true }
          : { summary: "Invalid date format — use YYYY-MM-DD.", ok: false };
      },
    },
    {
      name: "set_priority",
      description: "Set a card's priority. Cards are kept sorted by priority within each column.",
      inputSchema: cardRef.extend({ priority: z.enum(["low", "medium", "high", "urgent"] as [Priority, ...Priority[]]) }),
      execute: (input: { card_id?: string; card_title?: string; priority: Priority }) => {
        const found = resolveCard(input);
        if (!found) return { summary: "Card not found.", ok: false };
        const ok = useBoard.getState().setPriority(found.card.id, input.priority, "agent");
        return ok ? { summary: `"${found.card.title}" priority is now ${input.priority}.`, ok: true } : { summary: "Card not found.", ok: false };
      },
    },
    {
      name: "delete_card",
      description: "Permanently delete a card. Prefer moving to 'done' instead of deleting.",
      inputSchema: cardRef,
      annotations: { destructiveHint: true },
      execute: (input: { card_id?: string; card_title?: string }) => {
        const found = resolveCard(input);
        if (!found) return { summary: "Card not found.", ok: false };
        const ok = useBoard.getState().deleteCard(found.card.id, "agent");
        return ok ? { summary: `Deleted "${found.card.title}".`, ok: true } : { summary: "Card not found.", ok: false };
      },
    },
    {
      name: "undo_last_agent_action",
      description: "Undo the most recent change made by an agent tool on this board.",
      inputSchema: z.object({}),
      annotations: { destructiveHint: true },
      execute: () => {
        const undone = useBoard.getState().undoLastAgentAction();
        return undone
          ? { summary: `Undid: ${undone.label}.`, ok: true }
          : { summary: "No agent action left to undo.", ok: false };
      },
    },
  ];

  const results = await Promise.all(defs.map((d) => registerTool(d)));
  return results.filter(Boolean).length;
}

export const COLUMN_IDS = ["backlog", "todo", "in-progress", "done"] as const;
export { PRIORITIES };
