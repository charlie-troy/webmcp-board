import { create } from "zustand";
import {
  defaultBoard,
  uid,
  PRIORITY_ORDER,
  type Board,
  type Card,
  type Column,
  type Priority,
} from "./boardStore";
import { addDaysIso, isValidIsoDate, localDateIso } from "./date";

export type Source = "human" | "agent";

interface HistoryEntry {
  snapshot: Board;
  source: Source;
  label: string;
}

export type UndoAgentResult =
  | { ok: true; label: string }
  | { ok: false; reason: "no_agent_action" }
  | { ok: false; reason: "newer_human_changes"; label: string };

export interface CardInput {
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  priority?: Priority;
  columnId?: string;
}

interface BoardState {
  board: Board;
  history: HistoryEntry[];
  /** Id of the most recently moved card, for a subtle highlight animation. */
  lastMovedCardId: string | null;

  resolveColumn: (columnId?: string) => Column;
  createCard: (input: CardInput, source?: Source) => Card;
  moveCard: (cardId: string, columnId: string, position?: number, source?: Source) => boolean;
  editCard: (
    cardId: string,
    patch: { title?: string; description?: string },
    source?: Source,
  ) => boolean;
  assignCard: (cardId: string, assignee: string, source?: Source) => boolean;
  setDueDate: (cardId: string, dueDate: string, source?: Source) => boolean;
  setPriority: (cardId: string, priority: Priority, source?: Source) => boolean;
  deleteCard: (cardId: string, source?: Source) => boolean;
  searchCards: (query: string) => Array<{ card: Card; column: string }>;
  summarizeBoard: () => {
    asOf: string;
    dueSoonThrough: string;
    total: number;
    columns: Array<{ id: string; title: string; count: number }>;
    byAssignee: Record<string, number>;
    byPriority: Record<string, number>;
    overdue: Array<{ title: string; dueDate: string; column: string }>;
    dueSoon: Array<{ title: string; dueDate: string; column: string }>;
  };
  undoLastAgentAction: () => UndoAgentResult;
}

export const useBoard = create<BoardState>((set, get) => {
  function mutate(source: Source, label: string, fn: (board: Board) => void) {
    set((s) => {
      const before = structuredClone(s.board);
      const draft = structuredClone(s.board);
      fn(draft);
      // Invalid and idempotent requests should not become misleading undo
      // points. Undo must always target the last real board change.
      if (JSON.stringify(before) === JSON.stringify(draft)) return s;
      return {
        board: draft,
        history: [...s.history, { snapshot: before, source, label }].slice(-100),
      };
    });
  }

  function findCard(board: Board, cardId: string): { card: Card; column: Column; index: number } | null {
    for (const column of board.columns) {
      const index = column.cards.findIndex((c) => c.id === cardId);
      if (index >= 0) return { card: column.cards[index], column, index };
    }
    return null;
  }

  return {
    board: defaultBoard(),
    history: [],
    lastMovedCardId: null,

    resolveColumn: (columnId) => {
      const { board } = get();
      const normalized = columnId?.trim().toLowerCase() ?? "";
      return board.columns.find((c) => c.id === normalized || c.title.toLowerCase() === normalized) ?? board.columns[0];
    },

    createCard: (input, source = "human") => {
      let created!: Card;
      const title = input.title.trim().slice(0, 140);
      if (!title) throw new Error("Card title cannot be blank.");
      const dueDate = input.dueDate ?? "";
      if (dueDate && !isValidIsoDate(dueDate)) throw new Error("Due date must be a real YYYY-MM-DD calendar date.");
      mutate(source, `create_card("${input.title}")`, (b) => {
        const normalizedColumn = input.columnId?.trim().toLowerCase();
        const column = b.columns.find(
          (c) => c.id === (normalizedColumn ?? c.id) || c.title.toLowerCase() === (normalizedColumn ?? ""),
        ) ?? b.columns[0];
        created = {
          id: uid("card"),
          title,
          description: (input.description ?? "").slice(0, 1000),
          assignee: (input.assignee ?? "").trim().slice(0, 60),
          dueDate,
          priority: input.priority ?? "medium",
        };
        column.cards.push(created);
      });
      return created;
    },

    moveCard: (cardId, columnId, position, source = "human") => {
      const board = get().board;
      const foundBefore = findCard(board, cardId);
      const normalizedColumn = columnId.trim().toLowerCase();
      const targetBefore = board.columns.find(
        (c) => c.id === normalizedColumn || c.title.toLowerCase() === normalizedColumn,
      );
      if (!foundBefore || !targetBefore) return false;
      if (foundBefore.column.id === targetBefore.id) {
        const maxPosition = Math.max(0, targetBefore.cards.length - 1);
        const desiredPosition = position == null ? foundBefore.index : Math.max(0, Math.min(position, maxPosition));
        if (desiredPosition === foundBefore.index) return true;
      }
      let moved = false;
      mutate(source, `move_card(→ ${columnId})`, (b) => {
        const found = findCard(b, cardId);
        if (!found) return;
        const target = b.columns.find(
          (c) => c.id === normalizedColumn || c.title.toLowerCase() === normalizedColumn,
        );
        if (!target) return;
        found.column.cards.splice(found.index, 1);
        const pos = position == null ? target.cards.length : Math.max(0, Math.min(position, target.cards.length));
        target.cards.splice(pos, 0, found.card);
        moved = true;
      });
      if (moved) set({ lastMovedCardId: cardId });
      return moved;
    },

    editCard: (cardId, patch, source = "human") => {
      let ok = false;
      mutate(source, `edit_card()`, (b) => {
        const found = findCard(b, cardId);
        if (!found) return;
        if (patch.title == null && patch.description == null) return;
        if (patch.title != null) {
          const title = patch.title.trim().slice(0, 140);
          if (!title) return;
          found.card.title = title;
        }
        if (patch.description != null) found.card.description = patch.description.slice(0, 1000);
        ok = true;
      });
      return ok;
    },

    assignCard: (cardId, assignee, source = "human") => {
      let ok = false;
      mutate(source, `assign_card(→ ${assignee})`, (b) => {
        const found = findCard(b, cardId);
        if (!found) return;
        found.card.assignee = assignee.trim().slice(0, 60);
        ok = true;
      });
      return ok;
    },

    setDueDate: (cardId, dueDate, source = "human") => {
      let ok = false;
      if (dueDate !== "" && !isValidIsoDate(dueDate)) return false;
      mutate(source, `set_due_date(${dueDate || "cleared"})`, (b) => {
        const found = findCard(b, cardId);
        if (!found) return;
        found.card.dueDate = dueDate;
        ok = true;
      });
      return ok;
    },

    setPriority: (cardId, priority, source = "human") => {
      let ok = false;
      mutate(source, `set_priority(${priority})`, (b) => {
        const found = findCard(b, cardId);
        if (!found) return;
        found.card.priority = priority;
        // Keep cards sorted by priority within the column.
        found.column.cards.sort((a, z) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[z.priority]);
        ok = true;
      });
      return ok;
    },

    deleteCard: (cardId, source = "human") => {
      let deleted = false;
      mutate(source, "delete_card()", (b) => {
        const found = findCard(b, cardId);
        if (!found) return;
        found.column.cards.splice(found.index, 1);
        deleted = true;
      });
      return deleted;
    },

    searchCards: (query) => {
      const { board } = get();
      const q = query.trim().toLowerCase();
      const results: Array<{ card: Card; column: string }> = [];
      for (const column of board.columns) {
        for (const card of column.cards) {
          if (
            card.title.toLowerCase().includes(q) ||
            card.description.toLowerCase().includes(q) ||
            card.assignee.toLowerCase().includes(q)
          ) {
            results.push({ card, column: column.title });
          }
        }
      }
      return results;
    },

    summarizeBoard: () => {
      const { board } = get();
      const byAssignee: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      const overdue: Array<{ title: string; dueDate: string; column: string }> = [];
      const dueSoon: Array<{ title: string; dueDate: string; column: string }> = [];
      const today = localDateIso();
      const dueSoonThrough = addDaysIso(today, 7);
      let total = 0;
      for (const column of board.columns) {
        for (const card of column.cards) {
          total++;
          if (card.assignee) byAssignee[card.assignee] = (byAssignee[card.assignee] ?? 0) + 1;
          byPriority[card.priority] = (byPriority[card.priority] ?? 0) + 1;
          if (card.dueDate && card.dueDate < today && column.id !== "done") {
            overdue.push({ title: card.title, dueDate: card.dueDate, column: column.title });
          }
          if (
            card.dueDate &&
            card.dueDate >= today &&
            card.dueDate <= dueSoonThrough &&
            column.id !== "done"
          ) {
            dueSoon.push({ title: card.title, dueDate: card.dueDate, column: column.title });
          }
        }
      }
      overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      dueSoon.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      return {
        asOf: today,
        dueSoonThrough,
        total,
        columns: board.columns.map((c) => ({ id: c.id, title: c.title, count: c.cards.length })),
        byAssignee,
        byPriority,
        overdue,
        dueSoon,
      };
    },

    undoLastAgentAction: () => {
      const { history } = get();
      for (let i = history.length - 1; i >= 0; i--) {
        const entry = history[i];
        if (entry.source !== "agent") continue;
        if (history.slice(i + 1).some((newer) => newer.source === "human")) {
          return { ok: false, reason: "newer_human_changes", label: entry.label };
        }
        set({ board: entry.snapshot, history: history.slice(0, i), lastMovedCardId: null });
        return { ok: true, label: entry.label };
      }
      return { ok: false, reason: "no_agent_action" };
    },
  };
});
