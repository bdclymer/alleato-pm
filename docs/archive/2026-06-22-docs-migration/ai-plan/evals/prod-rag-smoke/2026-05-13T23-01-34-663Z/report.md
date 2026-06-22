# Production RAG Smoke - 2026-05-13T23-01-34-663Z

- Endpoint: https://projects.alleatogroup.com/api/ai-assistant/chat
- Deployment checked: projects.alleatogroup.com production
- Total: 5
- Pass: 2
- Fail: 3

| Case | Status | HTTP | Duration | Tools | Source signals | Project ids | Failures |
|---|---|---:|---:|---|---|---|---|
| 01-broad-semantic | FAIL | 0 | 0.0s | - | - | - | HTTP 0; short/no answer (0 chars); no persisted tool trace; missing required source signal: meeting; missing required source signal: email |
| 02-teams-search | FAIL | 200 | 9.2s | - | - | - | short/no answer (0 chars); no persisted tool trace; missing required source signal: teams |
| 03-email-search | FAIL | 0 | 0.0s | - | - | - | HTTP 0; short/no answer (0 chars); no persisted tool trace; missing required source signal: email |
| 04-onedrive-spec-docs | PASS | 200 | 55.3s | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, mcpToolDiscovery, mcpToolDiscovery, streamingToolPolicy, semanticSearch | teams_chat_export, user:njepson@alleatogroup.com, user:mparsons@alleatogroup.com, user:jdawson@alleatogroup.com, outlook_email, njepson@alleatogroup.com, mparsons@alleatogroup.com, jdawson@alleatogroup.com, ctragesser@alleatogroup.com, crusin@alleatogroup.com, Teams DM export: njepson@alleatogroup.com, Teams DM export: mparsons@alleatogroup.com | 795, 803 | - |
| 05-project-filtered | PASS | 200 | 25.0s | intentPlanner, promptContextReducer, assistantSourceHealth, clientProjectIntelligencePacket, mcpToolDiscovery, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot | teams_chat_export, user:njepson@alleatogroup.com, user:mparsons@alleatogroup.com, user:jdawson@alleatogroup.com, outlook_email, njepson@alleatogroup.com, mparsons@alleatogroup.com, jdawson@alleatogroup.com, ctragesser@alleatogroup.com, crusin@alleatogroup.com, Teams DM export: njepson@alleatogroup.com, Teams DM export: mparsons@alleatogroup.com | 67 | - |

## Answer Previews

### 01-broad-semantic - FAIL

```text
(no answer)
```

### 02-teams-search - FAIL

```text
(no answer)
```

### 03-email-search - FAIL

```text
(no answer)
```

### 04-onedrive-spec-docs - PASS

```text
I searched the loaded source evidence, and there’s nothing here on a OneDrive document titled **“31-000 Earthwork”** or any earthwork specification.

What that means:
- I do **not** have document-derived evidence to summarize from the current retrieval set.
- The loaded retrieval explicitly returned **0 matching source rows**, so anything more specific would be made up.
- Given the sync health, thin results could be a real miss or a pipeline issue — the likely weak point is the **embedding backlog**.

What I can say confidently:
- No document excerpts, metadata, or semantic matches for **“31-000 Earthwork”** are present in the available source context.
- So there’s no defensible summary of scope, excavation requirements, fill, compaction, testing, tolerances, or related spec language from that document.

Next step:
- Re-run retrieval against **OneDrive / document sources specifically** for:
  - **“31-000 Earthwork”**
  - **“earthwork specification”**
  - **“Division 31”**
  - filename variants like **“31 00 00”**, **“31-000”**, **“Earthwork”**
- If you want, send the retrieved document text or a broader source pull and I’ll turn it into a tight spec summary with the actual evidence
```

### 05-project-filtered - PASS

```text
**Vermillion Rise Warehouse (Project 67) latest status:** the job is still **design/contract coordination heavy**, with the most important near-term issue being that the **current drawing package still has meaningful design deficiencies** while the team is trying to keep the **permit/review path moving this week**. The latest RAG context points to **fire protection, electrical coordination, and contract finalization** as the items that matter most right now. [Source: Project Briefing Snapshot - Vermillion Rise Warehouse]

### What changed most recently
- In the **5/13 Hillsdale Holdings // Alleato Weekly** meeting, the team said **final review drawing sets are expected by Friday**, with **structural confirmation still pending**. These are review sets, not fully final permit documents. [Source: Project Briefing Snapshot - Vermillion Rise Warehouse]
- That same meeting surfaced **urgent sprinkler design issues**:
  - design reportedly **lacks double block valves**, creating a **water damage/flooding risk**
  - fire protection was apparently reduced from **four zones to two**, and the meeting notes say **no prior agreement was documented**
  - sprinkler headers were discussed as being
```
