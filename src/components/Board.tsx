import { useRef, useState } from "react";
import { useBoard } from "../state/store";
import { PRIORITIES, type Card, type Column } from "../state/boardStore";

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
  onHumanDelete,
}: {
  card: Card;
  column: Column;
  onHumanMove: (title: string, column: string) => void;
  onHumanDelete: (title: string, column: string) => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const moveCard = useBoard((s) => s.moveCard);
  const deleteCard = useBoard((s) => s.deleteCard);
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
          onChange={(e) => setPriority(card.id, e.target.value as Card["priority"])}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          className="mini danger"
          aria-label={`Delete ${card.title}`}
          title="Delete card"
          onClick={() => {
            const cardIndex = column.cards.findIndex((candidate) => candidate.id === card.id);
            const focusCardId = column.cards[cardIndex + 1]?.id ?? column.cards[cardIndex - 1]?.id;
            if (!deleteCard(card.id)) return;
            onHumanDelete(card.title, column.title);
            window.setTimeout(() => {
              const focusTarget = focusCardId
                ? document.querySelector<HTMLElement>(`[data-card-id="${focusCardId}"]`)
                : document.querySelector<HTMLElement>(`[data-column-id="${column.id}"] .mini.add`);
              focusTarget?.focus();
            }, 0);
          }}
        >
          ✕
        </button>
      </div>
    </article>
  );
}

export function Board() {
  const [announcement, setAnnouncement] = useState("");
  const columns = useBoard((s) => s.board.columns);
  const createCard = useBoard((s) => s.createCard);

  const addCard = (columnId: string) => {
    const title = window.prompt("Card title");
    if (!title?.trim()) return;
    const card = createCard({ title: title.trim(), columnId });
    const columnTitle = useBoard.getState().board.columns.find((column) => column.id === columnId)?.title ?? columnId;
    setAnnouncement(`${card.title} created in ${columnTitle}.`);
    window.setTimeout(() => document.querySelector<HTMLElement>(`[data-card-id="${card.id}"]`)?.focus(), 0);
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
              <button className="mini add" aria-label={`Add card to ${column.title}`} onClick={() => addCard(column.id)}>
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
                  onHumanDelete={(title, source) => setAnnouncement(`${title} deleted from ${source}.`)}
                />
              ))}
              {column.cards.length === 0 && <div className="empty-column">No cards</div>}
            </div>
          </section>
        ))}
      </main>
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
