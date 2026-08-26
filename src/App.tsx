import { useEffect, useState } from "react";
import { Board } from "./components/Board";
import { ActivityPanel } from "./components/ActivityPanel";
import { initWebMCP, getWebMCPStatus } from "./webmcp/modelContext";
import { registerAllTools } from "./webmcp/tools";

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
        <div className="logo">🖐️ Agent Hands Task Board</div>
        <div className="header-stats">Every drag-and-drop has an agent equivalent</div>
        <McpBadge />
      </header>
      <div className="workspace">
        <Board />
        <ActivityPanel />
      </div>
    </div>
  );
}

function McpBadge() {
  const [mode, setMode] = useState<string>("checking");
  useEffect(() => {
    setMode(getWebMCPStatus().mode);
  }, []);
  return (
    <div className={`mcp-badge ${mode}`} role="status">
      {mode === "native" && "● WebMCP native"}
      {mode === "polyfill" && "● WebMCP polyfill"}
      {mode === "unavailable" && "○ WebMCP unavailable"}
      {mode === "checking" && "○ WebMCP…"}
    </div>
  );
}
