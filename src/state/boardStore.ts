export type Priority = "low" | "medium" | "high" | "urgent";

export const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

export const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export interface Card {
  id: string;
  title: string;
  description: string;
  assignee: string;
  /** ISO date string (YYYY-MM-DD) or empty. */
  dueDate: string;
  priority: Priority;
}

export interface Column {
  id: string;
  title: string;
  cards: Card[];
}

export interface Board {
  columns: Column[];
}

let idCounter = 1;
export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

export function defaultBoard(): Board {
  const mk = (title: string, assignee: string, due: string, priority: Priority): Card => ({
    id: uid("card"),
    title,
    description: "",
    assignee,
    dueDate: due,
    priority,
  });
  return {
    columns: [
      {
        id: "backlog",
        title: "Backlog",
        cards: [
          mk("Audit color contrast on settings page", "Sam", "2026-09-04", "medium"),
          mk("Write keyboard nav docs", "Riley", "", "low"),
        ],
      },
      {
        id: "todo",
        title: "To Do",
        cards: [
          mk("Ship dark mode toggle", "Alex", "2026-08-28", "high"),
        ],
      },
      {
        id: "in-progress",
        title: "In Progress",
        cards: [
          mk("Fix screen-reader labels on checkout", "Jordan", "2026-08-27", "urgent"),
        ],
      },
      {
        id: "done",
        title: "Done",
        cards: [
          mk("Add focus rings to all buttons", "Sam", "2026-08-20", "medium"),
        ],
      },
    ],
  };
}
