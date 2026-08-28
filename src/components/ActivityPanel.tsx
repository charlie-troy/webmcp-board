import { useState } from "react";
import { useBoard } from "../state/store";
import { useActivityStore } from "../webmcp/activityStore";

function summarize(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "object" && "summary" in (value as Record<string, unknown>)) {
    const s = (value as Record<string, unknown>).summary;
    if (typeof s === "string") return s;
  }
  try {
    return JSON.stringify(value).slice(0, 140);
  } catch {
    return String(value);
  }
}

export function ActivityPanel() {
  const entries = useActivityStore((s) => s.entries);
  const clear = useActivityStore((s) => s.clear);
  const hasAgentAction = useBoard((s) => s.history.some((entry) => entry.source === "agent"));
  const undoLastAgentAction = useBoard((s) => s.undoLastAgentAction);
  const [undoStatus, setUndoStatus] = useState("");

  function undoAgentAction() {
    const result = undoLastAgentAction();
    if (result.ok) {
      setUndoStatus("Undid the latest agent change.");
    } else if (result.reason === "newer_human_changes") {
      setUndoStatus("Undo blocked: newer human work was preserved.");
    } else {
      setUndoStatus("No agent change is available to undo.");
    }
  }

  return (
    <aside className="activity-panel" aria-label="Agent activity log" aria-live="polite">
      <div className="panel-title">
        <span>Agent Activity</span>
        <span className="panel-actions">
          <button
            className="undo-agent-btn"
            onClick={undoAgentAction}
            disabled={!hasAgentAction}
            aria-label="Undo last agent action"
          >
            <span aria-hidden="true">↶</span> Undo
          </button>
          <button className="clear-btn" onClick={clear} aria-label="Clear activity log">
            ✕
          </button>
        </span>
      </div>
      {undoStatus && (
        <div className="human-agent-status" role="status" aria-label="Undo result" aria-atomic="true">
          {undoStatus}
        </div>
      )}
      <div className="activity-list" tabIndex={0} aria-label="Agent activity entries">
        {entries.length === 0 && (
          <div className="activity-empty">
            <p>No agent calls yet.</p>
            <p className="hint">Try these prompts in order:</p>
            <ol className="prompt-list">
              <li>“What’s on the board? Anything overdue or due this week?”</li>
              <li>“Move ‘Ship dark mode toggle’ to In Progress and set it to urgent.”</li>
              <li>“Create ‘A11y audit of settings page’, assign it to Sam, due September 4th.”</li>
            </ol>
          </div>
        )}
        {entries.map((e) => (
          <div key={e.id} className={`activity-entry ${e.status}`}>
            <div className="entry-head">
              <span className="entry-status-dot" aria-hidden="true" />
              <span className="entry-tool">{e.tool}</span>
              <span className="entry-time">{new Date(e.timestamp).toLocaleTimeString([], { hour12: false })}</span>
            </div>
            {e.status !== "running" && <div className="entry-result">{summarize(e.result)}</div>}
          </div>
        ))}
      </div>
    </aside>
  );
}
