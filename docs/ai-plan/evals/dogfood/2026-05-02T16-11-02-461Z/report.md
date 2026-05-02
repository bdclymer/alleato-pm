# Dogfood Run — 2026-05-02T16-11-02-461Z

- Endpoint: http://localhost:3000/api/ai-assistant/chat
- Total: 8
- Pass: 0
- Fail: 8

## Results

| # | Case | Status | Tools | Duration | Ground truth | Failures |
|---|---|---|---|---|---|---|
| 1 | 01-recent-meeting-issues | ❌ | 0 | 13.6s | 28 | STREAM ERROR: stream: terminated; Answer didn't reference any of the 28 actual meeting titles |
| 2 | 02-overdue-rfis | ❌ | 0 | 0.0s | 4 | STREAM ERROR: fetch failed |
| 3 | 03-pending-change-orders | ❌ | 0 | 0.0s | 1 | STREAM ERROR: fetch failed |
| 4 | 04-yesterday-meetings | ❌ | 0 | 0.0s | 7 | STREAM ERROR: fetch failed |
| 5 | 05-recent-emails | ❌ | 0 | 0.0s | 22 | STREAM ERROR: fetch failed |
| 6 | 06-active-projects | ❌ | 0 | 0.0s | 100 | STREAM ERROR: fetch failed; Answer never mentioned a count |
| 7 | 07-portfolio-risks | ❌ | 0 | 0.0s | n/a | STREAM ERROR: fetch failed; Answer too short: 0 chars |
| 8 | 08-cash-position | ❌ | 0 | 0.0s | n/a | STREAM ERROR: fetch failed; Neither gave a cash figure nor honestly said data unavailable |

## Per-case answer previews

### 01-recent-meeting-issues — ❌
**Prompt:** Were there any issues from the meetings in the last couple days?

**Tools fired (0):** (none)

**Answer preview:**
```

```

### 02-overdue-rfis — ❌
**Prompt:** Which RFIs are overdue right now? Who owes us a response?

**Tools fired (0):** (none)

**Answer preview:**
```

```

### 03-pending-change-orders — ❌
**Prompt:** What change orders are pending approval right now? What's the total exposure?

**Tools fired (0):** (none)

**Answer preview:**
```

```

### 04-yesterday-meetings — ❌
**Prompt:** Summarize yesterday's meetings.

**Tools fired (0):** (none)

**Answer preview:**
```

```

### 05-recent-emails — ❌
**Prompt:** What did we hear about in emails this past week? Any commitments or issues?

**Tools fired (0):** (none)

**Answer preview:**
```

```

### 06-active-projects — ❌
**Prompt:** How many active projects do we have right now? Quick summary.

**Tools fired (0):** (none)

**Answer preview:**
```

```

### 07-portfolio-risks — ❌
**Prompt:** What should I worry about across all my active projects right now? Top 3 risks.

**Tools fired (0):** (none)

**Answer preview:**
```

```

### 08-cash-position — ❌
**Prompt:** How does our cash position look right now?

**Tools fired (0):** (none)

**Answer preview:**
```

```
