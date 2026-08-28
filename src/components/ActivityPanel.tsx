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

interface DisplayChange {
  field: string;
  before: string;
  after: string;
}

function extractChanges(value: unknown): DisplayChange[] {
  if (value == null || typeof value !== "object") return [];
  const changes = (value as Record<string, unknown>).changes;
  if (!Array.isArray(changes)) return [];
  return changes.filter((change): change is DisplayChange => {
    if (change == null || typeof change !== "object") return false;
    const item = change as Record<string, unknown>;
    return typeof item.field === "string" && typeof item.before === "string" && typeof item.after === "string";
  });
}

export function ActivityPanel() {
  const entries = useActivityStore((s) => s.entries);
  const clear = useActivityStore((s) => s.clear);
  const hasAgentAction = useBoard((s) => s.history.some((entry) => entry.source === "agent"));
  const undoLastAgentAction = useBoard((s) => s.undoLastAgentAction);
  const [undoNotice, setUndoNotice] = useState<{ entryId?: number; message: string } | null>(null);
  const latestEntryId = entries[0]?.id;
  const undoStatus = undoNotice && undoNotice.entryId === latestEntryId ? undoNotice.message : "";

  function undoAgentAction() {
    const result = undoLastAgentAction();
    if (result.ok) {
      setUndoNotice({ entryId: latestEntryId, message: "Undid the latest agent change." });
    } else if (result.reason === "newer_human_changes") {
      setUndoNotice({ entryId: latestEntryId, message: "Undo blocked: newer human work was preserved." });
    } else {
      setUndoNotice({ entryId: latestEntryId, message: "No agent change is available to undo." });
    }
  }

  return (
    <aside className="activity-panel" aria-label="Agent activity and intent receipts">
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
      <div
        className="activity-list"
        tabIndex={0}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Agent activity entries"
      >
        {entries.length === 0 && (
          <div className="activity-empty">
            <p className="empty-title">Try the Focus Relay handoff</p>
            <ol className="prompt-list">
              <li><span className="prompt-mode">Focus</span> Tab to “Ship dark mode toggle.”</li>
              <li><span className="prompt-mode">Ask</span> “Move this to In Progress, assign Sam, make it urgent, due September 2nd.”</li>
              <li><span className="prompt-mode">Undo</span> “Undo that entire change.”</li>
            </ol>
          </div>
        )}
        {entries.map((e) => {
          const changes = extractChanges(e.result);
          return (
            <div key={e.id} className={`activity-entry ${e.status}`}>
              <div className="entry-head">
                <span className="entry-status-dot" aria-hidden="true" />
                <span className="entry-tool">{e.tool}</span>
                <span className="entry-time">{new Date(e.timestamp).toLocaleTimeString([], { hour12: false })}</span>
              </div>
              {e.status !== "running" && (
                <div className="entry-result">
                  <span>{summarize(e.result)}</span>
                  {changes.length > 0 && (
                    <dl className="change-receipt" aria-label="Before and after changes">
                      {changes.map((change) => (
                        <div className="change-row" key={change.field}>
                          <dt>{change.field}</dt>
                          <dd><span>{change.before}</span><b aria-label="changed to">→</b><strong>{change.after}</strong></dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
