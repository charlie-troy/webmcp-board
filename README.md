# 🖐️ Agent Hands — Focus Relay

**Point with focus. Act with language. Undo the entire intent.**

Agent Hands is an accessibility-first human-agent control pattern built on
**WebMCP**. A person navigates to an object with whatever input works for them—keyboard,
switch control, eye gaze, pointer, or another assistive device. The page remembers that
object as shared context. The person can then ask their browser agent to act on “this”
without reproducing its title or manipulating a dense interface.

The Kanban board is a deliberately familiar reference workspace. The invention is the
handoff: **human focus establishes context; WebMCP supplies the manipulation; an
accessible receipt and intent-level Undo preserve control.**

Built for the [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/).

## The Focus Relay interaction

1. Tab to **Ship dark mode toggle**. The page visibly marks it as the agent target.
2. Move focus to ChatGPT and ask:

   > *“Move this to In Progress, assign Sam, make it urgent, due September 2nd.”*

3. `update_current_card` applies all four changes as one atomic WebMCP operation.
4. The page displays and announces a semantic before/after receipt.
5. Ask *“Undo that entire change”* or press the visible **Undo** button. All four
   changes revert together.

The target persists while focus moves from the page to agent chat. If the target is
deleted, it clears safely. If a person changes the board after the agent, Undo refuses
to overwrite that newer human work.

## Why this requires in-page WebMCP

A backend task API can update a card by id. It does not naturally know which object a
person just reached through the live browser interface. Focus Relay uses ephemeral page
state—the human's last deliberately focused card—as agent context without scraping the
DOM, copying text, or replicating browser state on a server.

This implements the WebMCP goals of human-in-the-loop workflows, shared context,
visibility, history, control, and accessibility through an agent intermediary while
keeping the human interface primary.

## Accessibility and control

- Every human card operation has a schema-described WebMCP equivalent.
- `get_current_card` resolves “this/current/selected card” from human focus.
- `update_current_card` combines move, edit, assignment, priority, and due date into
  one validated transaction and one undo point.
- Before/after receipts are visible and exposed through a polite ARIA activity log.
- Cards remain fully keyboard-operable with visible focus and focus-retaining Left/Right
  movement; the complete editor requires no mouse.
- Human deletion requires confirmation. Agent undo never crosses newer human work.
- Strict date validation, authoritative card ids, stale-target handling, and bounded
  history prevent ambiguous or unsafe mutations.

The reusable pattern is documented in
[`docs/FOCUS_RELAY_PATTERN.md`](docs/FOCUS_RELAY_PATTERN.md).

## WebMCP tools

| Tool | Kind | Description |
|---|---|---|
| `summarize_board` | read | Counts, workload, priorities, overdue and due-soon work |
| `search_cards` | read | Search title, description, and assignee |
| `get_current_card` | read | Read the human's persistent Focus Relay target |
| `update_current_card` | action | Atomically update every field on the target as one reversible intent |
| `create_card` | action | Create with column, assignee, due date, and priority |
| `move_card` | action | Move a named card, with optional position |
| `edit_card` | action | Edit title and description |
| `assign_card` | action | Assign or clear assignee |
| `set_due_date` | action | Set a real YYYY-MM-DD date or clear it |
| `set_priority` | action | Set low, medium, high, or urgent |
| `delete_card` ⚠ | destructive | Permanently remove a named card |
| `undo_last_agent_action` ⚠ | destructive | Revert one agent intent without overwriting newer human work |

Named-card tools remain available for parity and bulk workflows. Agents should prefer
`update_current_card` when the user refers to “this” or asks for multiple changes.

## Architecture

- `src/state/store.ts` owns board state, persistent human targeting, atomic intent
  mutation, bounded history, and conflict-safe undo.
- `src/webmcp/tools.ts` defines 12 validated WebMCP tools and structured receipts.
- `src/components/Board.tsx` turns ordinary focus events into visible shared context.
- `src/components/ActivityPanel.tsx` renders the tool log and semantic change receipts.
- `src/webmcp/modelContext.ts` feature-detects native WebMCP, falls back to the official
  polyfill, validates inputs, and guarantees on-page logging.

## Verification

The checked-in release gate covers the exact Focus Relay journey; atomic multi-field
updates and one-step undo; target changes, deletion, and stale context; complete
keyboard-only create/edit/move/delete flows; human/agent races; Axe scans; forced
colors; reduced motion; 200% reflow; offline use; delayed resources; 100 editor cycles;
25 cold reloads with exactly 12 tools; and a deterministic 5,000-call, 105-card soak.
The human and WebMCP journeys run in Chromium, Firefox, and WebKit.

```bash
npm install
npx playwright install chromium firefox webkit
npm run test:release
```

## Run locally

```bash
npm install
npm run dev
```

## License

MIT
