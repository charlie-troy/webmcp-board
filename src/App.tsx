import { useEffect } from "react";
import { Board } from "./components/Board";
import { ActivityPanel } from "./components/ActivityPanel";
import { initWebMCP, getWebMCPStatus } from "./webmcp/modelContext";
import { useWebMCPStatus } from "./webmcp/statusStore";
import { registerAllTools } from "./webmcp/tools";
import { useBoard } from "./state/store";

export default function App() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initWebMCP();
        if (!cancelled && getWebMCPStatus().mode !== "unavailable") {
          await registerAllTools();
        }
      } catch (err) {
        console.error("[webmcp] init failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app">
      <a className="skip-link" href="#main-board">
        Skip to board
      </a>
      <header className="app-header">
        <div className="identity">
          <div className="logo">🖐️ Agent Hands</div>
          <div className="tagline">Point with focus. Act with language.</div>
        </div>
        <BoardPulse />
        <McpBadge />
      </header>
      <div className="workspace">
        <Board />
        <ActivityPanel />
      </div>
    </div>
  );
}

function BoardPulse() {
  const total = useBoard((s) => s.board.columns.reduce((sum, column) => sum + column.cards.length, 0));
  const dueSoon = useBoard((s) => s.summarizeBoard().dueSoon.length);
  const overdue = useBoard((s) => s.summarizeBoard().overdue.length);

  return (
    <div className="header-stats" aria-label={`Focus Relay workspace. ${total} cards. ${dueSoon} due this week. ${overdue} overdue.`}>
      Focus Relay workspace <span aria-hidden="true">·</span> {total} cards <span aria-hidden="true">·</span> {dueSoon} due this week <span aria-hidden="true">·</span> {overdue} overdue
    </div>
  );
}

function McpBadge() {
  const mode = useWebMCPStatus((s) => s.mode);
  return (
    <div className={`mcp-badge ${mode}`} role="status">
      {mode === "native" && "● WebMCP native"}
      {mode === "polyfill" && "● WebMCP polyfill"}
      {mode === "unavailable" && "○ WebMCP unavailable"}
      {mode === "checking" && "○ WebMCP…"}
    </div>
  );
}
