/**
 * Agent Hands Focus Relay — WebMCP tool catalog.
 *
 * Every physical manipulation and form interaction a human can perform has an
 * equivalent tool, so motor-impaired users can delegate the physical
 * manipulation to their agent while keeping full visibility and control.
 */
import { z } from "zod";
import { registerTool, type ToolDefinition } from "./modelContext";
import { useBoard } from "../state/store";
import { PRIORITIES, type Priority } from "../state/boardStore";
import { isValidIsoDate } from "../state/date";

const columnRef = z
  .string()
  .trim()
  .min(1)
  .describe("Column id or title: 'backlog', 'todo', 'in-progress', 'done' (case-insensitive).");

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidIsoDate, "Use a real calendar date in YYYY-MM-DD format.");

const cardRef = z.object({
  card_id: z.string().trim().min(1).optional().describe("Card id (preferred). Get ids from search_cards or summarize_board."),
  card_title: z.string().trim().min(1).optional().describe("Card title to match if the id is unknown (case-insensitive, must be unique)."),
});

const currentCardUpdate = z
  .object({
    title: z.string().trim().min(1).max(140).optional(),
    description: z.string().max(1000).optional(),
    assignee: z.string().trim().max(60).optional().describe("New assignee, or an empty string to clear."),
    due_date: z.union([z.literal(""), isoDate]).optional().describe("YYYY-MM-DD, or empty string to clear."),
    priority: z.enum(["low", "medium", "high", "urgent"] as [Priority, ...Priority[]]).optional(),
    column: columnRef.optional(),
    position: z.number().int().min(0).optional().describe("Optional 0-based position; priority sorting takes precedence."),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "Provide at least one card change.",
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
    // An explicit id is authoritative. Never fall back to a title and risk
    // mutating a different card when an agent is holding stale state.
    return null;
  }
  if (input.card_title) {
    const q = input.card_title.toLowerCase();
    const exact: FoundCard[] = [];
    const partial: FoundCard[] = [];
    for (const column of board.columns) {
      for (const card of column.cards) {
        const title = card.title.toLowerCase();
        if (title === q) exact.push({ card, column });
        else if (title.includes(q)) partial.push({ card, column });
      }
    }
    if (exact.length === 1) return exact[0];
    if (exact.length === 0 && partial.length === 1) return partial[0];
  }
  return null;
}

function resolveAgentTarget(): FoundCard | null {
  const targetId = useBoard.getState().agentTargetCardId;
  if (!targetId) return null;
  const target = resolveCard({ card_id: targetId });
  if (!target) useBoard.getState().setAgentTarget(null);
  return target;
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
          summary: `${summary.total} cards across ${summary.columns.length} columns. ${summary.overdue.length} overdue, ${summary.dueSoon.length} due by ${summary.dueSoonThrough}.`,
          ...summary,
        };
      },
    },
    {
      name: "search_cards",
      description: "Search cards by keyword across title, description, and assignee. Returns matching cards with their ids and columns.",
      inputSchema: z.object({ query: z.string().trim().min(1) }),
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
      name: "get_current_card",
      description:
        "Read the card the human most recently focused in Focus Relay. Use this when the user says 'this card', 'current card', or 'selected card'. The target persists while the user moves focus to agent chat.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
      execute: () => {
        const found = resolveAgentTarget();
        if (!found) {
          return {
            summary: "No Focus Relay target. Ask the user to focus a card on the board, then try again.",
            ok: false,
            reason: "no_target",
          };
        }
        return {
          summary: `The human's current target is "${found.card.title}" in ${found.column.title}.`,
          ok: true,
          card_id: found.card.id,
          title: found.card.title,
          description: found.card.description,
          assignee: found.card.assignee,
          due_date: found.card.dueDate,
          priority: found.card.priority,
          column: found.column.title,
          position: found.column.cards.findIndex((card) => card.id === found.card.id),
        };
      },
    },
    {
      name: "update_current_card",
      description:
        "Atomically update the card the human focused in Focus Relay. Prefer this single tool whenever the user says 'this/current/selected card' or requests multiple changes. Move, assign, prioritize, date, and edit in one reversible intent so one Undo restores the entire instruction.",
      inputSchema: currentCardUpdate,
      execute: (input: {
        title?: string;
        description?: string;
        assignee?: string;
        due_date?: string;
        priority?: Priority;
        column?: string;
        position?: number;
      }) => {
        const found = resolveAgentTarget();
        if (!found) {
          return {
            summary: "No Focus Relay target. Ask the user to focus a card on the board, then try again.",
            ok: false,
            reason: "no_target",
          };
        }
        const result = useBoard.getState().applyCardIntent(
          found.card.id,
          {
            title: input.title,
            description: input.description,
            assignee: input.assignee,
            dueDate: input.due_date,
            priority: input.priority,
            columnId: input.column,
            position: input.position,
          },
          "agent",
        );
        if (!result.ok) {
          const summaries = {
            card_not_found: "The Focus Relay target is no longer on the board.",
            column_not_found: `Column "${input.column}" not found.`,
            invalid_title: "Card title cannot be blank.",
            invalid_date: "Due date must be a real YYYY-MM-DD calendar date.",
            no_changes: `No changes were needed for "${found.card.title}".`,
          } as const;
          return { summary: summaries[result.reason], ok: false, reason: result.reason };
        }
        return {
          summary: `Updated "${result.title}" as one reversible intent. One Undo restores all ${result.changes.length} changes.`,
          ok: true,
          card_id: result.cardId,
          column: result.column,
          position: result.position,
          changes: result.changes,
          undo_scope: "entire_intent",
        };
      },
    },
    {
      name: "create_card",
      description: "Create a new card. Optionally set column, assignee, due date (YYYY-MM-DD), and priority.",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(140),
        description: z.string().max(1000).optional(),
        column: columnRef.optional(),
        assignee: z.string().trim().max(60).optional(),
        due_date: isoDate.optional().describe("Due date as YYYY-MM-DD, or omit."),
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
        "Move one named card to another column. For 'this/current card' or requests that change multiple fields, prefer update_current_card so the whole instruction is one reversible intent.",
      inputSchema: cardRef.extend({
        column: columnRef,
        position: z.number().int().min(0).optional().describe("0-based position in the destination column; defaults to the end."),
      }),
      execute: (input: { card_id?: string; card_title?: string; column: string; position?: number }) => {
        const found = resolveCard(input);
        if (!found) return { summary: "Card not found — use search_cards to get ids.", ok: false };
        const targetBefore = useBoard.getState().board.columns.find(
          (column) => column.id === input.column || column.title.toLowerCase() === input.column.toLowerCase(),
        );
        if (!targetBefore) return { summary: `Column "${input.column}" not found.`, ok: false };
        const fromColumn = found.column.title;
        const ok = useBoard.getState().moveCard(found.card.id, input.column, input.position, "agent");
        if (!ok) return { summary: `Could not move "${found.card.title}".`, ok: false };
        const boardAfter = useBoard.getState().board;
        const targetAfter = boardAfter.columns.find((column) => column.id === targetBefore.id) ?? targetBefore;
        const position = targetAfter.cards.findIndex((card) => card.id === found.card.id);
        return {
          summary: `Moved "${found.card.title}" from ${fromColumn} to ${targetAfter.title}.`,
          ok: true,
          card_id: found.card.id,
          from_column: fromColumn,
          to_column: targetAfter.title,
          position,
        };
      },
    },
    {
      name: "edit_card",
      description: "Edit a card's title and/or description.",
      inputSchema: cardRef.extend({
        title: z.string().trim().min(1).max(140).optional(),
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
        return ok
          ? { summary: `Updated "${found.card.title}".`, ok: true, card_id: found.card.id }
          : { summary: "Nothing to update.", ok: false };
      },
    },
    {
      name: "assign_card",
      description: "Assign a card to a person (or clear with an empty string).",
      inputSchema: cardRef.extend({ assignee: z.string().trim().max(60) }),
      execute: (input: { card_id?: string; card_title?: string; assignee: string }) => {
        const found = resolveCard(input);
        if (!found) return { summary: "Card not found.", ok: false };
        const ok = useBoard.getState().assignCard(found.card.id, input.assignee, "agent");
        return ok
          ? { summary: `"${found.card.title}" assigned to ${input.assignee || "nobody"}.`, ok: true, card_id: found.card.id, assignee: input.assignee }
          : { summary: "Card not found.", ok: false };
      },
    },
    {
      name: "set_due_date",
      description: "Set a card's due date (YYYY-MM-DD), or clear it with an empty string.",
      inputSchema: cardRef.extend({
        due_date: z.union([z.literal(""), isoDate]).describe("YYYY-MM-DD, or empty string to clear."),
      }),
      execute: (input: { card_id?: string; card_title?: string; due_date: string }) => {
        const found = resolveCard(input);
        if (!found) return { summary: "Card not found.", ok: false };
        const ok = useBoard.getState().setDueDate(found.card.id, input.due_date, "agent");
        return ok
          ? { summary: `Due date of "${found.card.title}" set to ${input.due_date || "(none)"}.`, ok: true, card_id: found.card.id, due_date: input.due_date }
          : { summary: "Invalid date format — use YYYY-MM-DD.", ok: false };
      },
    },
    {
      name: "set_priority",
      description: "Set one named card's priority. For 'this/current card' or multi-field requests, prefer update_current_card. Cards are sorted by priority within each column.",
      inputSchema: cardRef.extend({ priority: z.enum(["low", "medium", "high", "urgent"] as [Priority, ...Priority[]]) }),
      execute: (input: { card_id?: string; card_title?: string; priority: Priority }) => {
        const found = resolveCard(input);
        if (!found) return { summary: "Card not found.", ok: false };
        const ok = useBoard.getState().setPriority(found.card.id, input.priority, "agent");
        return ok
          ? { summary: `"${found.card.title}" priority is now ${input.priority}.`, ok: true, card_id: found.card.id, priority: input.priority }
          : { summary: "Card not found.", ok: false };
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
        return ok ? { summary: `Deleted "${found.card.title}".`, ok: true, card_id: found.card.id } : { summary: "Card not found.", ok: false };
      },
    },
    {
      name: "undo_last_agent_action",
      description:
        "Undo the most recent change made by an agent tool. Refuses safely if a person changed the board afterward, so newer human work is never overwritten.",
      inputSchema: z.object({}),
      annotations: { destructiveHint: true },
      execute: () => {
        const undone = useBoard.getState().undoLastAgentAction();
        if (undone.ok) return { summary: `Undid: ${undone.label}.`, ok: true };
        if (undone.reason === "newer_human_changes") {
          return {
            summary: "Undo blocked because a person changed the board afterward. Their newer work was preserved.",
            ok: false,
            reason: undone.reason,
          };
        }
        return { summary: "No agent action left to undo.", ok: false, reason: undone.reason };
      },
    },
  ];

  const results = await Promise.all(defs.map((d) => registerTool(d)));
  return results.filter(Boolean).length;
}

export const COLUMN_IDS = ["backlog", "todo", "in-progress", "done"] as const;
export { PRIORITIES };
