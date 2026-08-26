# Devpost Submission Draft — Agent Hands Task Board

> Copy/paste into the WebMCP Challenge submission form. Replace the `[PLACEHOLDER]`
> links after deploying and uploading the video. (The full write-up also lives in
> this repo's README.)

## Project title
**Agent Hands Task Board** — the board where the hands are optional

## Tagline (one line)
An accessibility-first Kanban board: every drag-and-drop has an agent tool, so you just say what you want moved.

## Elevator pitch (short description)
A Kanban board is a wall of drag-and-drop — a wall for users with motor impairments. Agent Hands gives **every physical interaction an agent equivalent**: all 10 card operations (move, edit, assign, re-prioritize, delete, due dates) are registered WebMCP tools, so a user can say *"move the checkout fix to Done and mark it urgent"* and watch it happen on the shared page. The human interface stays primary and fully keyboard-operable (arrow buttons instead of drag-and-drop, skip link, visible focus rings), and every agent action is logged in an `aria-live` Agent Activity panel so screen-reader and sighted users alike always know what the agent just did.

## Why WebMCP (the before/after)
The WebMCP standard explicitly names *improving accessibility through agents* as a goal: agents as capable intermediaries between assistive technology and human-first interfaces. This app is that idea, productized. Scraping agents can't reliably drag cards or fill forms blind; WebMCP gives them schema-described tools that map 1:1 to the human UI — same board, same data, same undo history.

**What became possible that wasn't before:** a motor-impaired user delegating the physical manipulation (drag, form-fill) to their agent while keeping complete visibility and control — including `undo_last_agent_action` — over the same board their team sees.

## How it works / demo flow
1. Open the site in ChatGPT's desktop browser (or Chrome with the WebMCP flag).
2. *"What's on the board? What's due soon?"* → `summarize_board` reads real state (columns, assignees, priorities, due dates).
3. *"Move 'Ship dark mode toggle' to In Progress and make it urgent."* → `move_card` + `set_priority`; the column re-sorts live.
4. *"Create a card: 'A11y audit of settings page', assign to Sam, due September 4th."* → one `create_card` call.
5. *"Undo the last change."* → `undo_last_agent_action`.

## Tools
`summarize_board` · `search_cards` · `create_card` · `move_card` · `edit_card` · `assign_card` · `set_due_date` · `set_priority` · `delete_card` ⚠ · `undo_last_agent_action` ⚠

(⚠ = annotated `destructiveHint`.)

## Tech stack
Vite + React + TypeScript · Zustand (state) · Zod → JSON Schema (tool schemas) · official `@mcp-b/webmcp-polyfill` fallback · `document.modelContext` / `navigator.modelContext` feature detection · ARIA/WCAG-first markup

## Links
- **GitHub:** https://github.com/charlie-troy/webmcp-board
- **Live demo:** [DEPLOY_URL_PLACEHOLDER]
- **Video:** [YOUTUBE_URL_PLACEHOLDER] (script: `docs/VIDEO_SCRIPT.md`)

## Team
[Your name] — solo

## Tags
webmcp, ai-agents, accessibility, a11y, kanban, productivity

## License
MIT (in-repo)
