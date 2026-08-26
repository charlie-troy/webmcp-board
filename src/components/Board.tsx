import { useBoard } from "../state/store";
import { PRIORITIES, type Card, type Column } from "../state/boardStore";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#fc8181",
  high: "#f6ad55",
  medium: "#63b3ed",
  low: "#68d391",
};

function BoardCard({ card, column }: { card: Card; column: Column }) {
  const moveCard = useBoard((s) => s.moveCard);
  const deleteCard = useBoard((s) => s.deleteCard);
  const setPriority = useBoard((s) => s.setPriority);
  const lastMoved = useBoard((s) => s.lastMovedCardId === card.id);
  const colIdx = useBoard.getState().board.columns.findIndex((c) => c.id === column.id);
  const columns = useBoard((s) => s.board.columns);

  const nextColumn = columns[colIdx + 1];
  const prevColumn = columns[colIdx - 1];

  return (
    <article
      className={`card ${lastMoved ? "just-moved" : ""}`}
      aria-label={`Card: ${card.title}. Priority ${card.priority}.${card.assignee ? ` Assigned to ${card.assignee}.` : ""}${card.dueDate ? ` Due ${card.dueDate}.` : ""}`}
    >
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
            onClick={() => moveCard(card.id, prevColumn.id, undefined)}
          >
            ←
          </button>
        )}
        {nextColumn && (
          <button
            className="mini"
            aria-label={`Move ${card.title} to ${nextColumn.title}`}
            title={`→ ${nextColumn.title}`}
            onClick={() => moveCard(card.id, nextColumn.id, undefined)}
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
          onClick={() => deleteCard(card.id)}
        >
          ✕
        </button>
      </div>
    </article>
  );
}

export function Board() {
  const columns = useBoard((s) => s.board.columns);
  const createCard = useBoard((s) => s.createCard);

  const addCard = (columnId: string) => {
    const title = window.prompt("Card title");
    if (title?.trim()) createCard({ title: title.trim(), columnId });
  };

  return (
    <main id="main-board" className="board" aria-label="Task board">
      {columns.map((column) => (
        <section className="column" key={column.id} aria-label={`${column.title} column, ${column.cards.length} cards`}>
          <header className="column-header">
            <h2>{column.title}</h2>
            <span className="count">{column.cards.length}</span>
            <button className="mini add" aria-label={`Add card to ${column.title}`} onClick={() => addCard(column.id)}>
              +
            </button>
          </header>
          <div className="column-cards">
            {column.cards.map((card) => (
              <BoardCard key={card.id} card={card} column={column} />
            ))}
            {column.cards.length === 0 && <div className="empty-column">No cards</div>}
          </div>
        </section>
      ))}
    </main>
  );
}
