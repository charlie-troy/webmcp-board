import { useEffect, useRef, useState, type FormEvent } from "react";
import { useBoard } from "../state/store";
import { PRIORITIES, type Card, type Column, type Priority } from "../state/boardStore";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#fc8181",
  high: "#f6ad55",
  medium: "#63b3ed",
  low: "#68d391",
};

function BoardCard({
  card,
  column,
  onHumanMove,
  onHumanPriority,
  onEdit,
  onRequestDelete,
}: {
  card: Card;
  column: Column;
  onHumanMove: (title: string, column: string) => void;
  onHumanPriority: (title: string, priority: Priority) => void;
  onEdit: (card: Card, column: Column) => void;
  onRequestDelete: (card: Card, column: Column) => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const moveCard = useBoard((s) => s.moveCard);
  const setPriority = useBoard((s) => s.setPriority);
  const lastMoved = useBoard((s) => s.lastMovedCardId === card.id);
  const colIdx = useBoard.getState().board.columns.findIndex((c) => c.id === column.id);
  const columns = useBoard((s) => s.board.columns);

  const nextColumn = columns[colIdx + 1];
  const prevColumn = columns[colIdx - 1];

  const moveTo = (target: Column, keepFocus = false) => {
    if (!moveCard(card.id, target.id, undefined)) return;
    onHumanMove(card.title, target.title);
    if (keepFocus) {
      window.setTimeout(() => {
        const movedCard = document.querySelector<HTMLElement>(`[data-card-id="${card.id}"]`);
        (movedCard ?? cardRef.current)?.focus();
      }, 0);
    }
  };

  return (
    <article
      ref={cardRef}
      data-card-id={card.id}
      className={`card ${lastMoved ? "just-moved" : ""}`}
      aria-label={`Card: ${card.title}. Priority ${card.priority}.${card.assignee ? ` Assigned to ${card.assignee}.` : ""}${card.dueDate ? ` Due ${card.dueDate}.` : ""}`}
      aria-describedby={`card-help-${card.id}`}
      aria-keyshortcuts="ArrowLeft ArrowRight"
      tabIndex={0}
      onKeyDown={(event) => {
        // Let buttons and the priority select keep their native arrow-key behavior.
        if (event.currentTarget !== event.target) return;
        const target = event.key === "ArrowLeft" ? prevColumn : event.key === "ArrowRight" ? nextColumn : undefined;
        if (!target) return;
        event.preventDefault();
        moveTo(target, true);
      }}
    >
      <span id={`card-help-${card.id}`} className="sr-only">Focused card: press Left or Right to move it between columns.</span>
      <div className="card-top">
        <span className="priority-dot" style={{ background: PRIORITY_COLORS[card.priority] }} aria-hidden="true" />
        <h3 className="card-title">{card.title}</h3>
      </div>
      {card.description && <p className="card-desc">{card.description}</p>}
      <div className="card-meta">
        {card.assignee && <span className="assignee">@{card.assignee}</span>}
        {card.dueDate && (
          <span className="due">due {card.dueDate}</span>
        )}
      </div>
      <div className="card-actions" role="group" aria-label={`Actions for ${card.title}`}>
        {prevColumn && (
          <button
            className="mini"
            aria-label={`Move ${card.title} to ${prevColumn.title}`}
            title={`← ${prevColumn.title}`}
            onClick={() => {
              moveTo(prevColumn, true);
            }}
          >
            ←
          </button>
        )}
        {nextColumn && (
          <button
            className="mini"
            aria-label={`Move ${card.title} to ${nextColumn.title}`}
            title={`→ ${nextColumn.title}`}
            onClick={() => {
              moveTo(nextColumn, true);
            }}
          >
            →
          </button>
        )}
        <select
          className="mini-select"
          aria-label={`Priority of ${card.title}`}
          value={card.priority}
          onChange={(e) => {
            const priority = e.target.value as Card["priority"];
            if (setPriority(card.id, priority)) onHumanPriority(card.title, priority);
          }}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          className="mini"
          aria-label={`Edit ${card.title}`}
          title="Edit card"
          onClick={() => onEdit(card, column)}
        >
          ✎
        </button>
        <button
          className="mini danger"
          aria-label={`Delete ${card.title}`}
          title="Delete card"
          onClick={() => onRequestDelete(card, column)}
        >
          ✕
        </button>
      </div>
    </article>
  );
}

interface EditorValues {
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
}

type EditorState =
  | { mode: "create"; columnId: string; columnTitle: string }
  | { mode: "edit"; card: Card; columnId: string };

function CardEditorDialog({
  editor,
  onCancel,
  onSave,
}: {
  editor: EditorState;
  onCancel: () => void;
  onSave: (values: EditorValues) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const initial = editor.mode === "edit" ? editor.card : undefined;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [assignee, setAssignee] = useState(initial?.assignee ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [error, setError] = useState("");
  const headingId = `card-editor-${editor.mode}-title`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    titleRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Enter a card title.");
      titleRef.current?.focus();
      return;
    }
    setError("");
    onSave({ title, description, assignee, dueDate, priority });
  };

  return (
    <dialog
      ref={dialogRef}
      className="card-dialog"
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <form className="card-form" onSubmit={submit} noValidate>
        <div className="dialog-heading">
          <div>
            <span className="dialog-kicker">{editor.mode === "create" ? editor.columnTitle : "Card details"}</span>
            <h2 id={headingId}>{editor.mode === "create" ? "Create card" : "Edit card"}</h2>
          </div>
          <button type="button" className="dialog-close" aria-label="Close card editor" onClick={onCancel}>×</button>
        </div>

        <label className="form-field">
          <span>Title</span>
          <input
            ref={titleRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={140}
            required
            aria-describedby={error ? "card-title-error" : undefined}
          />
        </label>
        {error && <p id="card-title-error" className="form-error" role="alert">{error}</p>}

        <label className="form-field">
          <span>Description <small>optional</small></span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={4} />
        </label>

        <div className="form-row">
          <label className="form-field">
            <span>Assignee <small>optional</small></span>
            <input value={assignee} onChange={(event) => setAssignee(event.target.value)} maxLength={60} placeholder="Name" />
          </label>
          <label className="form-field">
            <span>Due date <small>optional</small></span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
        </div>

        <label className="form-field">
          <span>Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>

        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="button primary">{editor.mode === "create" ? "Create card" : "Save changes"}</button>
        </div>
      </form>
    </dialog>
  );
}

interface DeleteState {
  card: Card;
  column: Column;
  nextFocusId?: string;
}

function DeleteCardDialog({ pending, onCancel, onConfirm }: {
  pending: DeleteState;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    cancelRef.current?.focus();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="card-dialog confirm-dialog"
      aria-labelledby="delete-card-title"
      aria-describedby="delete-card-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="card-form">
        <span className="dialog-kicker">Permanent action</span>
        <h2 id="delete-card-title">Delete this card?</h2>
        <p id="delete-card-description"><strong>{pending.card.title}</strong> will be removed from {pending.column.title}. Agent undo cannot restore a human deletion.</p>
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="button secondary" onClick={onCancel}>Keep card</button>
          <button type="button" className="button destructive" onClick={onConfirm}>Delete card</button>
        </div>
      </div>
    </dialog>
  );
}

export function Board() {
  const [announcement, setAnnouncement] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DeleteState | null>(null);
  const columns = useBoard((s) => s.board.columns);
  const createCard = useBoard((s) => s.createCard);
  const updateCard = useBoard((s) => s.updateCard);
  const deleteCard = useBoard((s) => s.deleteCard);

  const addCard = (columnId: string) => {
    const columnTitle = useBoard.getState().board.columns.find((column) => column.id === columnId)?.title ?? columnId;
    setEditor({ mode: "create", columnId, columnTitle });
  };

  const focusCard = (cardId: string) => window.setTimeout(() => document.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`)?.focus(), 0);
  const focusAddButton = (columnId: string) => window.setTimeout(() => document.querySelector<HTMLElement>(`[data-add-column="${columnId}"]`)?.focus(), 0);

  const cancelEditor = () => {
    const closing = editor;
    setEditor(null);
    if (!closing) return;
    if (closing.mode === "edit") focusCard(closing.card.id);
    else focusAddButton(closing.columnId);
  };

  const saveEditor = (values: EditorValues) => {
    const saving = editor;
    if (!saving) return;
    if (saving.mode === "create") {
      const card = createCard({ ...values, columnId: saving.columnId });
      setEditor(null);
      setAnnouncement(`${card.title} created in ${saving.columnTitle}.`);
      focusCard(card.id);
      return;
    }
    if (!updateCard(saving.card.id, values)) {
      setEditor(null);
      setAnnouncement(`${saving.card.title} is no longer on the board. Your edit was not applied.`);
      focusAddButton(saving.columnId);
      return;
    }
    setEditor(null);
    setAnnouncement(`${values.title.trim()} updated.`);
    focusCard(saving.card.id);
  };

  return (
    <div className="board-shell">
      <AttentionStrip />
      <main id="main-board" className="board" aria-label="Task board">
        <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
        {columns.map((column) => (
          <section className="column" data-column-id={column.id} key={column.id} aria-label={`${column.title} column, ${column.cards.length} cards`}>
            <header className="column-header">
              <h2>{column.title}</h2>
              <span className="count">{column.cards.length}</span>
              <button className="mini add" data-add-column={column.id} aria-label={`Add card to ${column.title}`} onClick={() => addCard(column.id)}>
                +
              </button>
            </header>
            <div className="column-cards">
              {column.cards.map((card) => (
                <BoardCard
                  key={card.id}
                  card={card}
                  column={column}
                  onHumanMove={(title, destination) => setAnnouncement(`${title} moved to ${destination}.`)}
                  onHumanPriority={(title, priority) => setAnnouncement(`${title} priority changed to ${priority}.`)}
                  onEdit={(cardToEdit, sourceColumn) => setEditor({ mode: "edit", card: cardToEdit, columnId: sourceColumn.id })}
                  onRequestDelete={(cardToDelete, sourceColumn) => {
                    const cardIndex = sourceColumn.cards.findIndex((candidate) => candidate.id === cardToDelete.id);
                    const nextFocusId = sourceColumn.cards[cardIndex + 1]?.id ?? sourceColumn.cards[cardIndex - 1]?.id;
                    setPendingDelete({ card: cardToDelete, column: sourceColumn, nextFocusId });
                  }}
                />
              ))}
              {column.cards.length === 0 && <div className="empty-column">No cards</div>}
            </div>
          </section>
        ))}
      </main>
      {editor && <CardEditorDialog editor={editor} onCancel={cancelEditor} onSave={saveEditor} />}
      {pendingDelete && (
        <DeleteCardDialog
          pending={pendingDelete}
          onCancel={() => {
            const cardId = pendingDelete.card.id;
            setPendingDelete(null);
            focusCard(cardId);
          }}
          onConfirm={() => {
            const deleting = pendingDelete;
            const deleted = deleteCard(deleting.card.id);
            setPendingDelete(null);
            if (deleted) {
              setAnnouncement(`${deleting.card.title} deleted from ${deleting.column.title}.`);
              if (deleting.nextFocusId) focusCard(deleting.nextFocusId);
              else focusAddButton(deleting.column.id);
            } else {
              setAnnouncement(`${deleting.card.title} was already removed. Nothing else was deleted.`);
              focusAddButton(deleting.column.id);
            }
          }}
        />
      )}
    </div>
  );
}

function AttentionStrip() {
  const dueSoon = useBoard((s) => s.summarizeBoard().dueSoon.map((card) => card.title).join(" · "));
  const overdue = useBoard((s) => s.summarizeBoard().overdue.map((card) => card.title).join(" · "));
  const dueSoonCount = useBoard((s) => s.summarizeBoard().dueSoon.length);
  const overdueCount = useBoard((s) => s.summarizeBoard().overdue.length);
  const items = [overdue, dueSoon].filter(Boolean).join(" · ");

  return (
    <section className="attention-strip" aria-label="Board focus queue">
      <span className="attention-kicker">Focus queue</span>
      {overdueCount > 0 && <span className="attention-chip overdue-chip">{overdueCount} overdue</span>}
      {dueSoonCount > 0 && <span className="attention-chip due-chip">{dueSoonCount} due this week</span>}
      <span className={`attention-items ${items ? "" : "attention-clear"}`} aria-live="polite">
        {items || "All clear — no overdue or due-soon cards."}
      </span>
      <span className="attention-hint">Tab to a card · ←/→ moves it</span>
    </section>
  );
}
