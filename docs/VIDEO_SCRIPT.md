# Agent Hands: Focus Relay — Demo Video Script (<3 min)

**Target:** 2:20–2:35 · 1080p · captions on · browser maximized.

## Arc

| Time | Section | What judges should understand |
|---|---|---|
| 0:00–0:18 | Hook | Reaching an object and manipulating it are different abilities |
| 0:18–0:42 | Handoff | Human focus becomes persistent WebMCP context |
| 0:42–1:25 | Atomic intent | Four changes, one tool call, one receipt |
| 1:25–1:58 | Control | One Undo; newer human work wins |
| 1:58–2:20 | Transfer | This is a reusable pattern, not a Kanban feature |
| 2:20–2:30 | Close | Point with focus. Act with language. |

## Shot-by-shot

### 0:00–0:18 — The barrier

**Visual:** Keyboard focus moves through a card and its move, priority, edit, assignee, and
date controls. Do not use the mouse.

**VO:** “Reaching an object and manipulating every control attached to it are different
abilities. A person may reach this card with a keyboard, switch, eye gaze, or screen
reader—but dragging it and completing a dense form can still be painful or impossible.”

### 0:18–0:42 — Focus Relay

**Visual:** Tab to **Ship dark mode toggle**. Hold on the teal target highlight and Focus
Relay banner. Then move focus into ChatGPT while the target remains visible.

**VO:** “Agent Hands separates indication from manipulation. Human focus establishes the
target. The page remembers that stable card identity while I move to my browser agent.
This live, human-established page context is what WebMCP contributes.”

### 0:42–1:25 — One human intent

**Prompt:** `Move this to In Progress, assign Sam, make it urgent, due September 2nd.`

**Tool:** `update_current_card`

**Visual:** Show one tool call—not four. Show the card move and then linger on the receipt:
Assignee Alex → Sam; Due date Aug 28 → Sep 2; Priority high → urgent; Column To Do → In
Progress.

**VO:** “I never repeated the title. ‘This’ came from Focus Relay. One schema-validated
tool applies the complete instruction atomically. The visible activity log is also a polite
live region, and its receipt exposes the same before-and-after state to sighted and blind
users. One sentence, one operation, one undo point.”

### 1:25–1:58 — Control, not automation theater

**Visual:** Press the visible **Undo** button once; show all four values restore. Repeat the
agent change, then alter another card with the keyboard and attempt Undo; show the clear
blocked message and preserved human edit.

**VO:** “One Undo reverses the entire intent. But the agent is subordinate to the person:
if I make a newer change, rollback refuses to overwrite my work. Visibility, history, and
control are behavior here—not claims in a slide.”

### 1:58–2:20 — Beyond the board

**Visual:** Briefly show `docs/FOCUS_RELAY_PATTERN.md`, then return to the live target flow.

**VO:** “The board is a familiar reference workspace, not the invention. The same pattern
can hand a selected spreadsheet range, design object, timeline clip, CRM record, calendar
event, or form section from a human to an agent without losing the live interface.”

### 2:20–2:30 — Close

**Visual:** Full board with target, WebMCP native badge, and receipt visible. End card with
live URL and repository.

**VO:** “Agent Hands. Point with focus. Act with language. Undo the entire intent.”

## Recording checklist

- [ ] Use ChatGPT's browser or Chrome with native WebMCP enabled.
- [ ] Badge reads **WebMCP native**.
- [ ] Begin with keyboard input; no mouse during the handoff.
- [ ] The prompt uses “this,” never the card title.
- [ ] Only one `update_current_card` entry appears.
- [ ] All four receipt rows are readable for at least three seconds.
- [ ] One Undo visibly restores all four fields.
- [ ] Captions accurately spell WebMCP and Focus Relay.
- [ ] Total runtime remains below 2:40.
