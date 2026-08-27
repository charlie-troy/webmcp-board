# 🖐️ Agent Hands Task Board

An accessibility-first Kanban board built on **WebMCP**, designed for the reality that
many interactions on the web — drag-and-drop above all — are physically impossible or
painful for users with motor impairments. Here, **every physical manipulation and form
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
- Agent undo is human-safe: it restores the latest agent change, but refuses to roll
  back the board if a person has made a newer change.
- The human interface remains primary and fully keyboard-operable: visible focus rings,
  skip link, ARIA labels on every control, and explicit arrow controls instead of
  drag-and-drop. Cards are focusable too: Tab to a card, then use Left/Right to move
  it while focus follows the card. A real modal editor exposes title, description,
  assignee, due date, and priority without a mouse; destructive human deletion requires
  confirmation. The agent is an optional set of hands, not a replacement UI.
- The header mirrors the same attention state the agent reads — total cards, due-this-week,
  and overdue counts — while a focus queue names the cards that need attention, so human
  and agent always share the same current picture.

## Tools

| Tool | Kind | Description |
|---|---|---|
| `summarize_board` | read | Counts per column, workload per assignee, overdue and due-soon cards |
| `search_cards` | read | Keyword search across title/description/assignee |
| `create_card` | action | With column, assignee, due date, priority |
| `move_card` | action | Move between columns, optional 0-based position; returns from/to and final position |
| `edit_card` | action | Title and description |
| `assign_card` | action | Assign / clear assignee |
| `set_due_date` | action | Real YYYY-MM-DD calendar date, or empty to clear |
| `set_priority` | action | low / medium / high / urgent (auto-sorts column) |
| `delete_card` ⚠ | destructive | Permanent removal |
| `undo_last_agent_action` | destructive | Revert the last agent change |

## Try it with an agent

Open the deployed site in ChatGPT's desktop browser (GPT-5.6 Sol/Terra) or Chrome with
`chrome://flags/#enable-webmcp-testing` enabled, then ask:

> *"What's on the board? Anything overdue or due this week?"*
> *"Move 'Ship dark mode toggle' to In Progress and set it to urgent."*
> *"Create a card: 'A11y audit of settings page', assign to Sam, due September 4th."*

## Architecture

- `src/state/store.ts` — Zustand board store; humans and tools mutate through the same
  actions, every changed action is snapshotted, and undo will not overwrite newer human work.
- `src/webmcp/` — feature detection + official polyfill fallback + logging wrapper;
  Zod schemas compiled to JSON Schema.

## Verification

The release gate is checked into this repository. It covers the exact README journey;
complete keyboard-only create/edit/move/delete flows; stale human/agent dialog races;
safe undo conflicts; Axe scans; forced colors, reduced motion, and 200% reflow; offline
use after load; delayed resources; 100 editor cycles; 25 cold reloads; and a 5,000-call,
105-card deterministic WebMCP soak. The human and WebMCP journeys run in Chromium,
Firefox, and WebKit. Lighthouse scores 100 for performance, accessibility, best
practices, SEO, and agentic browsing on the production build.

```bash
npm install
npx playwright install chromium firefox webkit
npm run test:release
```

The longer stress gate is intentionally not a toy smoke test: on the reference Windows
machine, 5,000 schema-validated, rendered, activity-logged mutations complete in about
3.8 minutes.

## Run locally

```bash
npm install
npm run dev
```

## License

MIT
