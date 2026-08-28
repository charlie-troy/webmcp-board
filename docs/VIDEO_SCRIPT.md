# 🖐️ Agent Hands Task Board — Demo Video Script (<3 min)

**Target length:** 2:30–2:45 · **Format:** 1080p, browser maximized, screen + voiceover.
Captions on. Record each section in one continuous take; the cut points are the only edits.

## Arc at a glance

| Time | Section | Goal |
|---|---|---|
| 0:00–0:15 | Hook | The accessibility story |
| 0:15–0:40 | The problem | Drag-and-drop is a wall; scraping agents can't help |
| 0:40–1:45 | The magic | Natural-language board operations via tools |
| 1:45–2:20 | Co-use | Keyboard-first UI + agent undo |
| 2:20–2:40 | Close | WebMCP's accessibility goal, shipped |

---

## Shot-by-shot

### 0:00–0:15 — Hook
**Visual:** Board with the demo data (Backlog / To Do / In Progress / Done), the header pulse and **Focus queue** visible, focus ring on a card.
**VO:** "A Kanban board is a wall of drag-and-drop. For someone with limited hand mobility, every single move is a wall. This board makes the hands optional: say what you want done, and keep the same visible, keyboard-operable board."

### 0:15–0:40 — The problem
**Visual:** Quick clip of an agent *without* WebMCP trying to drag a card — mouse cursor grabbing, missing the target, menus mis-clicked. ~10s, then cut.
**VO:** "An agent scraping the DOM can't reliably drag cards, hunt through menus, or fill form fields blind. WebMCP changes the contract: the site registers its actions as tools, described with schemas the agent actually understands."

### 0:40–1:45 — The magic
**Visual:** ChatGPT desktop (or flagged Chrome), site open. Type prompts; watch cards move and the Agent Activity panel log each call.
**Prompt 1:** `What's on the board? Anything overdue or due this week?`
**Tool call:** `summarize_board` (returns counts per column, workload per assignee, overdue cards, and the next seven days of due dates).
**VO:** "Ask what needs attention and it reads the real state — columns, assignees, priorities, overdue work, and what's due next. Not pixels. Data."
**Prompt 2:** `Move "Ship dark mode toggle" to In Progress and make it urgent.`
**Tool calls:** `move_card` → `set_priority(urgent)` (column re-sorts by priority).
**VO:** "'Move the dark mode toggle to In Progress and make it urgent.' The card glides over, the column re-sorts by priority, and the tool reports its source and destination — exactly what a human drag would do, in one sentence."
**Prompt 3:** `Create a card: "A11y audit of settings page", assign to Sam, due September 4th.`
**Tool call:** `create_card` (title + assignee + due date in one call).
**VO:** "Even multi-field forms collapse into one instruction. And every action is announced in the Agent Activity panel — it's a live region, so a screen reader announces each change too. Sighted and blind users always know what the agent just did."

### 1:45–2:20 — Co-use
**Visual:** Immediately after the agent-created card appears, point to the now-enabled **Undo** button in Agent Activity and click it. Show the card disappear and the live confirmation. Then use only the keyboard: open a card's full editor, briefly show its title / description / assignee / due date / priority fields, press **Escape** and show focus return to the card. Use **Left/Right** to move it between columns — show the focus ring staying with the card and the Focus queue updating.
**Shared operation:** the visible button uses the same conflict-safe undo path as `undo_last_agent_action`.
**VO:** "The agent is never beyond undo: I can reverse its latest change right here, or ask it to undo. Either way, it will never overwrite newer human work. The human interface still exposes every field without a mouse. Escape returns focus to the same card, Left and Right move it without dragging, and a live announcement confirms every human change."

### 2:20–2:40 — Close
**Visual:** Full board, Activity panel full of entries.
**VO:** "WebMCP's charter names accessibility as a first-class goal. This board is that idea, shipped: the same board, the same data — but the hands are optional. Repo and live link below."
**End card:** Title · "Built with WebMCP" · GitHub repo · live URL.

---

## Recording checklist
- [ ] Header badge reads **"WebMCP active"** (native). If "polyfill", enable `chrome://flags/#enable-webmcp-testing` or use ChatGPT desktop.
- [ ] Browser window 1600×900+, no stray tabs.
- [ ] Voiceover clean; no background music under VO.
- [ ] Stumble? Pause 1 second, restart the sentence — cut later.
- [ ] Total runtime ≤ 2:45. Fix auto-captions on tool names after upload.
