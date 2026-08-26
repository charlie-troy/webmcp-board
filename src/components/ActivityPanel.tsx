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

  return (
    <aside className="activity-panel" aria-label="Agent activity log" aria-live="polite">
      <div className="panel-title">
        Agent Activity
        <button className="clear-btn" onClick={clear} aria-label="Clear activity log">
          ✕
        </button>
      </div>
      <div className="activity-list">
        {entries.length === 0 && (
          <div className="activity-empty">
            No agent calls yet.
            <br />
            <span className="hint">
              Ask your agent: “Move the checkout fix to Done and mark the dark mode card urgent.”
            </span>
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
