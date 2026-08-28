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

export interface CardIntentPatch {
  title?: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  priority?: Priority;
  columnId?: string;
  position?: number;
}

export interface IntentChange {
  field: "Title" | "Description" | "Assignee" | "Due date" | "Priority" | "Column" | "Position";
  before: string;
  after: string;
}

export type ApplyCardIntentResult =
  | {
      ok: true;
      cardId: string;
      title: string;
      column: string;
      position: number;
      changes: IntentChange[];
    }
  | { ok: false; reason: "card_not_found" | "column_not_found" | "invalid_title" | "invalid_date" | "no_changes" };

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
  /** Last card deliberately focused by the human. Persists while focus moves to the agent chat. */
  agentTargetCardId: string | null;

  resolveColumn: (columnId?: string) => Column;
  setAgentTarget: (cardId: string | null) => boolean;
  applyCardIntent: (cardId: string, patch: CardIntentPatch, source?: Source) => ApplyCardIntentResult;
  createCard: (input: CardInput, source?: Source) => Card;
  moveCard: (cardId: string, columnId: string, position?: number, source?: Source) => boolean;
  editCard: (
    cardId: string,
    patch: { title?: string; description?: string },
    source?: Source,
  ) => boolean;
  updateCard: (cardId: string, patch: Partial<Omit<Card, "id">>, source?: Source) => boolean;
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
    let changed = false;
    set((s) => {
      // Board objects are replaced, never mutated in place, so the current
      // immutable value is already a safe history snapshot. Avoid cloning the
      // entire board twice for every action; this matters under agent bursts.
      const before = s.board;
      const draft = structuredClone(s.board);
      fn(draft);
      // Invalid and idempotent requests should not become misleading undo
      // points. Undo must always target the last real board change.
      if (JSON.stringify(before) === JSON.stringify(draft)) return s;
      changed = true;
      return {
        board: draft,
        history: [...s.history, { snapshot: before, source, label }].slice(-100),
      };
    });
    return changed;
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
    agentTargetCardId: null,

    resolveColumn: (columnId) => {
      const { board } = get();
      const normalized = columnId?.trim().toLowerCase() ?? "";
      return board.columns.find((c) => c.id === normalized || c.title.toLowerCase() === normalized) ?? board.columns[0];
    },

    setAgentTarget: (cardId) => {
      if (cardId !== null && !findCard(get().board, cardId)) return false;
      if (get().agentTargetCardId === cardId) return true;
      set({ agentTargetCardId: cardId });
      return true;
    },

    applyCardIntent: (cardId, patch, source = "agent") => {
      const beforeBoard = get().board;
      const foundBefore = findCard(beforeBoard, cardId);
      if (!foundBefore) return { ok: false, reason: "card_not_found" };

      const title = patch.title?.trim().slice(0, 140);
      if (patch.title != null && !title) return { ok: false, reason: "invalid_title" };
      if (patch.dueDate != null && patch.dueDate !== "" && !isValidIsoDate(patch.dueDate)) {
        return { ok: false, reason: "invalid_date" };
      }

      const normalizedColumn = patch.columnId?.trim().toLowerCase();
      const targetBefore = normalizedColumn == null
        ? foundBefore.column
        : beforeBoard.columns.find(
            (column) => column.id === normalizedColumn || column.title.toLowerCase() === normalizedColumn,
          );
      if (!targetBefore) return { ok: false, reason: "column_not_found" };

      const changed = mutate(source, `update_current_card("${foundBefore.card.title}")`, (board) => {
        const found = findCard(board, cardId);
        if (!found) return;

        if (patch.title != null) found.card.title = title!;
        if (patch.description != null) found.card.description = patch.description.slice(0, 1000);
        if (patch.assignee != null) found.card.assignee = patch.assignee.trim().slice(0, 60);
        if (patch.dueDate != null) found.card.dueDate = patch.dueDate;
        if (patch.priority != null) found.card.priority = patch.priority;

        const target = board.columns.find((column) => column.id === targetBefore.id)!;
        if (found.column.id !== target.id || patch.position != null) {
          found.column.cards.splice(found.index, 1);
          const position = patch.position == null
            ? target.cards.length
            : Math.max(0, Math.min(patch.position, target.cards.length));
          target.cards.splice(position, 0, found.card);
        }

        // Priority order is a board invariant. It intentionally wins over an
        // explicit position when both are supplied, and the final position is
        // returned in the receipt.
        if (patch.priority != null) {
          target.cards.sort((a, z) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[z.priority]);
        }
      });

      if (!changed) return { ok: false, reason: "no_changes" };

      const foundAfter = findCard(get().board, cardId)!;
      const display = (value: string, empty: string) => value || empty;
      const changes: IntentChange[] = [];
      if (foundBefore.card.title !== foundAfter.card.title) {
        changes.push({ field: "Title", before: foundBefore.card.title, after: foundAfter.card.title });
      }
      if (foundBefore.card.description !== foundAfter.card.description) {
        changes.push({
          field: "Description",
          before: display(foundBefore.card.description, "No description"),
          after: display(foundAfter.card.description, "No description"),
        });
      }
      if (foundBefore.card.assignee !== foundAfter.card.assignee) {
        changes.push({
          field: "Assignee",
          before: display(foundBefore.card.assignee, "Unassigned"),
          after: display(foundAfter.card.assignee, "Unassigned"),
        });
      }
      if (foundBefore.card.dueDate !== foundAfter.card.dueDate) {
        changes.push({
          field: "Due date",
          before: display(foundBefore.card.dueDate, "No due date"),
          after: display(foundAfter.card.dueDate, "No due date"),
        });
      }
      if (foundBefore.card.priority !== foundAfter.card.priority) {
        changes.push({ field: "Priority", before: foundBefore.card.priority, after: foundAfter.card.priority });
      }
      if (foundBefore.column.id !== foundAfter.column.id) {
        changes.push({ field: "Column", before: foundBefore.column.title, after: foundAfter.column.title });
      }
      const finalPosition = foundAfter.column.cards.findIndex((card) => card.id === cardId);
      if (foundBefore.column.id === foundAfter.column.id && foundBefore.index !== finalPosition) {
        changes.push({ field: "Position", before: String(foundBefore.index), after: String(finalPosition) });
      }

      set({ lastMovedCardId: foundBefore.column.id === foundAfter.column.id ? null : cardId });
      return {
        ok: true,
        cardId,
        title: foundAfter.card.title,
        column: foundAfter.column.title,
        position: finalPosition,
        changes,
      };
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

    updateCard: (cardId, patch, source = "human") => {
      const title = patch.title?.trim().slice(0, 140);
      if (patch.title != null && !title) return false;
      if (patch.dueDate != null && patch.dueDate !== "" && !isValidIsoDate(patch.dueDate)) return false;

      let ok = false;
      mutate(source, "update_card()", (b) => {
        const found = findCard(b, cardId);
        if (!found) return;
        if (patch.title != null) found.card.title = title!;
        if (patch.description != null) found.card.description = patch.description.slice(0, 1000);
        if (patch.assignee != null) found.card.assignee = patch.assignee.trim().slice(0, 60);
        if (patch.dueDate != null) found.card.dueDate = patch.dueDate;
        if (patch.priority != null) {
          found.card.priority = patch.priority;
          found.column.cards.sort((a, z) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[z.priority]);
        }
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
      if (deleted && get().agentTargetCardId === cardId) set({ agentTargetCardId: null });
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
        const targetId = get().agentTargetCardId;
        set({
          board: entry.snapshot,
          history: history.slice(0, i),
          lastMovedCardId: null,
          agentTargetCardId: targetId && findCard(entry.snapshot, targetId) ? targetId : null,
        });
        return { ok: true, label: entry.label };
      }
      return { ok: false, reason: "no_agent_action" };
    },
  };
});
