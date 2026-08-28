# Devpost Submission Draft — Agent Hands: Focus Relay

> Copy/paste into the WebMCP Challenge submission form. Replace the video placeholder.

## Project title

**Agent Hands: Focus Relay**

## Tagline

Point with focus. Act with language. Undo the entire intent.

## Elevator pitch

A person may be able to reach an object with a keyboard, switch, eye-gaze system, screen
reader, or pointer—but still find dragging, repeated tabbing, and dense forms painful or
impossible. Focus Relay separates indication from manipulation. Focus a card; ask the
browser agent to update “this”; WebMCP reads the shared page context and applies the whole
instruction as one atomic, reversible operation.

The Kanban board is a deliberately familiar reference workspace. The novel interaction is
the handoff: human focus establishes context, WebMCP supplies the hands, and an equivalent
visual and auditory before/after receipt preserves control.

## What became possible with WebMCP

Tab to **Ship dark mode toggle**, move focus to ChatGPT, and say:

> “Move this to In Progress, assign Sam, make it urgent, due September 2nd.”

The target survives the move to agent chat. `get_current_card` resolves “this” from the
human's last deliberate focus. `update_current_card` validates and changes four fields in
one call, one activity receipt, and one history entry. One Undo restores the entire
instruction. If the human edits the board afterward, rollback refuses to overwrite that
newer work.

A backend API can update a card by id. It does not naturally know which object the person
just reached inside the live browser. Focus Relay is built around precisely that ephemeral,
human-established page context—the reason this belongs in WebMCP rather than a generic
chatbot integration.

## Judging fit

- **WebMCP Leverage:** 12 structured tools operate on the visible page's real state. Two
  contextual tools turn transient human focus into structured agent context and an atomic
  intent. Named-card parity tools remain available for ordinary and bulk workflows.
- **Execution:** the target is persistent, id-based, visibly highlighted, screen-reader
  announced, and safely cleared when stale. Compound updates validate before mutation,
  return structured before/after fields, and create exactly one undo point. The primary UI
  remains fully keyboard-operable.
- **Potential Impact:** the pattern transfers to selected spreadsheet ranges, design
  objects, timeline clips, CRM records, calendar events, map features, and form sections—
  anywhere a person can indicate an object but needs help manipulating it.
- **Creativity & Ambition:** this is not “AI added to a task board.” It is a reference
  interaction pattern for accessible shared control between a human, a page, and a browser
  agent.

## Human control and safety

- The page visibly names the current agent target.
- Every tool call appears in a polite ARIA activity log.
- Atomic operations produce semantic before/after receipts.
- The visible Undo button and `undo_last_agent_action` share the same safe history.
- Undo never crosses newer human work.
- Missing or deleted targets fail explicitly; tools never guess another card.
- Invalid dates, titles, columns, and schemas produce no partial mutation.
- Human deletion requires confirmation; destructive tools are annotated.

## Demo flow

1. Open the live app in ChatGPT's browser.
2. Use **Tab**—not the mouse—to focus **Ship dark mode toggle**. Show the card highlight and
   Focus Relay banner naming it as the agent target.
3. Ask the four-field prompt above.
4. Show the single `update_current_card` call, live board mutation, and four before/after
   receipt rows.
5. Press **Undo** once. Show all four fields restored.
6. Repeat the intent, make a newer keyboard edit elsewhere, and show rollback refuse to
   overwrite the person's work.
7. Briefly show the full keyboard editor and Left/Right card movement to establish that the
   agent augments rather than replaces the human interface.

## Tools

`summarize_board` · `search_cards` · `get_current_card` · `update_current_card` ·
`create_card` · `move_card` · `edit_card` · `assign_card` · `set_due_date` ·
`set_priority` · `delete_card` ⚠ · `undo_last_agent_action` ⚠

## Verification

The public release gate runs the Focus Relay journey in Chromium, Firefox, and WebKit;
complete keyboard flows; target lifecycle and stale-state cases; human/agent races; Axe;
forced colors; reduced motion; 200% reflow; offline and delayed loading; 100 editor cycles;
25 cold registrations; and a deterministic 5,000-call, 105-card soak.

## Tech stack

Vite + React + TypeScript · Zustand · Zod → JSON Schema · native
`document.modelContext` with official polyfill fallback · Playwright · Axe

## Links

- **GitHub:** https://github.com/charlie-troy/webmcp-board
- **Live demo:** https://webmcp-board.vercel.app
- **Pattern document:** `docs/FOCUS_RELAY_PATTERN.md`
- **Video:** [YOUTUBE_URL_PLACEHOLDER]

## Team

Charlie Troy — solo

## Tags

webmcp, accessibility, assistive-technology, human-agent-collaboration, focus-relay

## License

MIT
