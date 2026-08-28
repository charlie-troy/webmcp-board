# Focus Relay: an accessible human-agent handoff pattern

## Problem

Many interfaces require a person to both identify an object and physically manipulate
several controls attached to it. A user may be able to reach the object with a keyboard,
switch, eye-gaze system, screen reader, or pointer but find dragging, repeated tabbing,
or dense forms painful, slow, or impossible.

Conventional agent tools usually make the user identify that object again by title or id.
Backend tools also lose the transient context already established in the browser.

## Pattern

Focus Relay separates **indication** from **manipulation**:

1. The human reaches an object through the primary interface.
2. The page stores that deliberate focus as a persistent agent target.
3. The target remains stable while the human moves to browser-agent chat.
4. A read-only contextual tool exposes the target's current structured state.
5. One compound action tool applies the user's complete intent atomically.
6. The page emits an equivalent visual and auditory before/after receipt.
7. One Undo reverses the entire intent, unless newer human work would be overwritten.

The application UI remains primary. The agent augments the person's available means of
manipulation; it does not replace the interface.

## Reference implementation

Agent Hands uses two contextual tools:

- `get_current_card()` reads the last card focused by the human.
- `update_current_card({ title?, description?, assignee?, due_date?, priority?, column?, position? })`
  validates and applies every supplied field in one board transaction.

The stable card id—not its mutable label—is retained as context. Focus moving to a child
control selects the owning card. Focus moving outside the board does not clear the target.
Deletion and an undo that removes the target do clear it.

## Safety invariants

1. **Human precedence:** an agent undo is blocked after any newer human board mutation.
2. **Intent atomicity:** a compound action creates either one history entry or none.
3. **No partial validation:** invalid title, date, column, or schema input changes nothing.
4. **Authoritative identity:** stale ids never fall back to a possibly different title.
5. **Visible execution:** every tool call appears in the activity log.
6. **Equivalent receipt:** changed fields expose both previous and resulting values.
7. **Stale-context safety:** a missing target produces an explicit failure, never a guess.
8. **Bounded state:** history and visible activity remain capped under long agent bursts.

## Why WebMCP

The pattern depends on the current page's live interaction state and executes through the
same client-side actions as the human UI. WebMCP lets the browser agent consume that state
without screenshot interpretation, DOM actuation, a duplicated backend integration, or
loss of the visible workspace.

## Transfer to other interfaces

The target need not be a card. The same pattern applies to:

- a spreadsheet cell or selected range;
- a design object on a canvas;
- a timeline clip in an editor;
- a customer record in a CRM;
- a calendar event;
- a chart, map feature, or data point;
- a form section reached through assistive navigation.

Each implementation should expose a small read tool, one domain-appropriate atomic action
tool, a visible target indicator, a semantic receipt, and conflict-aware undo.

## Acceptance tests

- No target returns an actionable `no_target` response.
- Target survives focus moving to agent chat.
- Rapid focus changes select only the most recent valid object.
- Multi-field execution produces one receipt and one undo point.
- No-op and invalid requests produce no history entry.
- Target survives edits and moves because identity is stable.
- Target clears when its object is deleted or removed by undo.
- Newer human work blocks agent rollback.
- Receipt and target state have no serious or critical Axe violations.
- Forced colors, reduced motion, keyboard-only use, and 200% reflow remain operable.

## Standards context

- [WebMCP explainer](https://github.com/webmachinelearning/webmcp): human-in-the-loop,
  shared context, visibility, history, control, and accessibility through agents.
- [Current WebMCP draft](https://webmachinelearning.github.io/webmcp/): in-page tools,
  browser-agent observation, structured schemas, and tool lifecycle.
- [Chrome WebMCP guidance](https://developer.chrome.com/docs/ai/webmcp): reliable
  structured actuation with visible execution in the user's page.
