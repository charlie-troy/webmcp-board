# 🖐️ Agent Hands Task Board

An accessibility-first Kanban board built on **WebMCP**, designed for the reality that
many interactions on the web — drag-and-drop above all — are physically impossible or
painful for users with motor impairments. Here, **every drag-and-drop and form
interaction a human can do has an equivalent agent tool**, so a motor-impaired user can
say *"move the checkout fix to Done and mark it urgent"* and watch it happen on the
shared page.

Built for the [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/).

## Why WebMCP fits this app

The WebMCP standard explicitly names "improve accessibility through agents" as a goal:
agents act as capable intermediaries between assistive technology and human-first
interfaces. This app is that idea, productized:

- Every card action (move, edit, assign, re-prioritize, delete) is a registered,
  schema-described tool — no DOM scraping, no simulated clicks.
- Every tool call is logged in an on-page **Agent Activity** panel (`aria-live="polite"`),
  so screen-reader and sighted users alike always know what the agent just did.
- The human interface remains primary and fully keyboard-operable: visible focus rings,
  skip link, ARIA labels on every control, and arrow buttons that replace drag-and-drop.

## Tools

| Tool | Kind | Description |
|---|---|---|
| `summarize_board` | read | Counts per column, workload per assignee, overdue cards |
| `search_cards` | read | Keyword search across title/description/assignee |
| `create_card` | action | With column, assignee, due date, priority |
| `move_card` | action | Move between columns, optional 0-based position |
| `edit_card` | action | Title and description |
| `assign_card` | action | Assign / clear assignee |
| `set_due_date` | action | YYYY-MM-DD, or empty to clear |
| `set_priority` | action | low / medium / high / urgent (auto-sorts column) |
| `delete_card` ⚠ | destructive | Permanent removal |
| `undo_last_agent_action` | destructive | Revert the last agent change |

## Try it with an agent

Open the deployed site in ChatGPT's desktop browser (GPT-5.6 Sol/Terra) or Chrome with
`chrome://flags/#enable-webmcp-testing` enabled, then ask:

> *"What's on the board? Anything overdue?"*
> *"Move 'Ship dark mode toggle' to In Progress and set it to urgent."*
> *"Create a card: 'A11y audit of settings page', assign to Sam, due September 4th."*

## Architecture

- `src/state/store.ts` — Zustand board store; humans and tools mutate through the same
  actions, and every mutation snapshots for `undo_last_agent_action`.
- `src/webmcp/` — feature detection + official polyfill fallback + logging wrapper;
  Zod schemas compiled to JSON Schema.

## Run locally

```bash
npm install
npm run dev
```

## License

MIT
