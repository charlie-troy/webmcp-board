# Devpost Submission Draft — Agent Hands Task Board

> Copy/paste into the WebMCP Challenge submission form. Replace the `[PLACEHOLDER]`
> links after deploying and uploading the video. (The full write-up also lives in
> this repo's README.)

## Project title
**Agent Hands Task Board** — the board where the hands are optional

## Tagline (one line)
An accessibility-first Kanban board where the hands are optional: say what to move, and keep the same visible, keyboard-operable board.

## Elevator pitch (short description)
A Kanban board is a wall of drag-and-drop — a wall for users with motor impairments. Agent Hands gives **every physical interaction an agent equivalent**: all 10 card operations (move, edit, assign, re-prioritize, delete, due dates) are registered WebMCP tools, so a user can say *"move the checkout fix to Done and mark it urgent"* and watch it happen on the shared page. The human interface stays primary and fully keyboard-operable (arrow buttons instead of drag-and-drop, skip link, visible focus rings, and Left/Right card shortcuts that retain focus), and every agent action is logged in an `aria-live` Agent Activity panel so screen-reader and sighted users alike always know what the agent just did. The header mirrors the board's due-soon and overdue counts, and a visible focus queue names the cards that need attention before anyone acts.

## Why WebMCP (the before/after)
The WebMCP standard explicitly names *improving accessibility through agents* as a goal: agents as capable intermediaries between assistive technology and human-first interfaces. This app is that idea, productized. Scraping agents can't reliably drag cards or fill forms blind; WebMCP gives them schema-described tools that map 1:1 to the human UI — same board, same data, same undo history.

**What became possible that wasn't before:** a motor-impaired user delegating the physical manipulation (drag, form-fill) to their agent while keeping complete visibility and control — including `undo_last_agent_action` — over the same board their team sees.

## Judging fit

- **WebMCP Leverage:** tools map to the board's actual operations and return structured card ids, columns, dates, priorities, and explicit failures for unknown cards or columns.
- **Execution:** the seeded board is useful on first load; the human UI remains keyboard-operable with visible focus, card-level Left/Right shortcuts, arrow controls, a focus queue, an activity live region, and the same Zustand actions underneath.
- **Potential Impact:** an agent can become an optional set of hands for users who cannot reliably drag cards or complete dense forms, without taking control away from the user.
- **Creativity & Ambition:** accessibility is the product thesis, not a checklist — the board treats agent mediation as an assistive capability with visibility and undo.

## How it works / demo flow
1. Open the site in ChatGPT's desktop browser (or Chrome with the WebMCP flag).
2. *"What's on the board? Anything overdue or due this week?"* → `summarize_board` reads real state (columns, assignees, priorities, overdue cards, and the next seven days of due dates).
3. *"Move 'Ship dark mode toggle' to In Progress and make it urgent."* → `move_card` + `set_priority`; the tool returns the source/destination and final position while the column re-sorts live.
4. *"Create a card: 'A11y audit of settings page', assign to Sam, due September 4th."* → one `create_card` call.
5. Tab to a card and press **Left/Right** to move it without a drag; the focused card stays focused and the live announcement confirms the destination.
6. *"Undo the last change."* → `undo_last_agent_action`.

## Tools
`summarize_board` · `search_cards` · `create_card` · `move_card` · `edit_card` · `assign_card` · `set_due_date` · `set_priority` · `delete_card` ⚠ · `undo_last_agent_action` ⚠

(⚠ = annotated `destructiveHint`.)

## Tech stack
Vite + React + TypeScript · Zustand (state) · Zod → JSON Schema (tool schemas) · official `@mcp-b/webmcp-polyfill` fallback · `document.modelContext` / `navigator.modelContext` feature detection · ARIA/WCAG-first markup

## Links
- **GitHub:** https://github.com/charlie-troy/webmcp-board
- **Live demo:** https://webmcp-board.vercel.app
- **Video:** [YOUTUBE_URL_PLACEHOLDER] (script: `docs/VIDEO_SCRIPT.md`)

## Team
Charlie Troy — solo

## Tags
webmcp, ai-agents, accessibility, a11y, kanban, productivity

## License
MIT (in-repo)
