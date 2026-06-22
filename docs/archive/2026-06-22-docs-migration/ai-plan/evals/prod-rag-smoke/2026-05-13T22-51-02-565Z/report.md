# Production RAG Smoke - 2026-05-13T22-51-02-565Z

- Endpoint: https://projects.alleatogroup.com/api/ai-assistant/chat
- Deployment checked: projects.alleatogroup.com production
- Total: 5
- Pass: 4
- Fail: 1

| Case | Status | HTTP | Duration | Tools | Source signals | Project ids | Failures |
|---|---|---:|---:|---|---|---|---|
| 01-broad-semantic | FAIL | 200 | 8.4s | intentPlanner, promptContextReducer, assistantSourceHealth, sourceSpecificRagRetrieval | teams_chat_export, user:njepson@alleatogroup.com, user:mparsons@alleatogroup.com, user:jdawson@alleatogroup.com, outlook_email, njepson@alleatogroup.com, mparsons@alleatogroup.com, jdawson@alleatogroup.com, ctragesser@alleatogroup.com, crusin@alleatogroup.com, Teams DM export: njepson@alleatogroup.com, Teams DM export: mparsons@alleatogroup.com | 754, 814, 178 | missing required source signal: meeting |
| 02-teams-search | PASS | 200 | 3.6s | intentPlanner, featureRequestPacketRouter | - | - | - |
| 03-email-search | PASS | 200 | 12.6s | intentPlanner, assistantSourceHealth, taskSourceReview | teams_chat_export, user:njepson@alleatogroup.com, user:mparsons@alleatogroup.com, user:jdawson@alleatogroup.com, outlook_email, njepson@alleatogroup.com, mparsons@alleatogroup.com, jdawson@alleatogroup.com, ctragesser@alleatogroup.com, crusin@alleatogroup.com, Teams DM export: njepson@alleatogroup.com, Teams DM export: mparsons@alleatogroup.com | - | - |
| 04-onedrive-spec-docs | PASS | 200 | 30.9s | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, mcpToolDiscovery, mcpToolDiscovery, streamingToolPolicy | teams_chat_export, user:njepson@alleatogroup.com, user:mparsons@alleatogroup.com, user:jdawson@alleatogroup.com, outlook_email, njepson@alleatogroup.com, mparsons@alleatogroup.com, jdawson@alleatogroup.com, ctragesser@alleatogroup.com, crusin@alleatogroup.com, Teams DM export: njepson@alleatogroup.com, Teams DM export: mparsons@alleatogroup.com | - | - |
| 05-project-filtered | PASS | 200 | 22.7s | intentPlanner, promptContextReducer, assistantSourceHealth, clientProjectIntelligencePacket, mcpToolDiscovery, mcpToolDiscovery, streamingToolPolicy, getProjectBriefingSnapshot | teams_chat_export, user:njepson@alleatogroup.com, user:mparsons@alleatogroup.com, user:jdawson@alleatogroup.com, outlook_email, njepson@alleatogroup.com, mparsons@alleatogroup.com, jdawson@alleatogroup.com, ctragesser@alleatogroup.com, crusin@alleatogroup.com, Teams DM export: njepson@alleatogroup.com, Teams DM export: mparsons@alleatogroup.com | 67 | - |

## Answer Previews

### 01-broad-semantic - FAIL

```text
**Last Five Emails in Supabase**

1. **Email: Re: B-roll Alleato/Goodwill event confirmation (June 19th)** — 2026-05-13 [Source: outlook_AAMkADAwNzg3ZTA5LTJmMWEtNDczNi04ODcxLTk1MTA1ODhmYmIyNABGAAAAAAAU1WTKtGciQa9go1eRAG9JBwD__y9hPlJRRYxFT5QN_MgoAAAAAAEMAAD__y9hPlJRRYxFT5QN_MgoAAQmLTXIAAA=]
2. **Email: Re: B-roll Alleato/Goodwill event confirmation (June 19th)** — 2026-05-13 [Source: outlook_AAMkADAwNzg3ZTA5LTJmMWEtNDczNi04ODcxLTk1MTA1ODhmYmIyNABGAAAAAAAU1WTKtGciQa9go1eRAG9JBwD__y9hPlJRRYxFT5QN_MgoAAAAAAEMAAD__y9hPlJRRYxFT5QN_MgoAAQmLTXKAAA=]
3. **Email: Re: B-roll Alleato/Goodwill event confirmation (June 19th)** — 2026-05-13 [Source: outlook_AAMkADAwNzg3ZTA5LTJmMWEtNDczNi04ODcxLTk1MTA1ODhmYmIyNABGAAAAAAAU1WTKtGciQa9go1eRAG9JBwD__y9hPlJRRYxFT5QN_MgoAAAAAAEMAAD__y9hPlJRRYxFT5QN_MgoAAQmLTXOAAA=]
4. **Email: Re: Fire Supression Deckers** — 2026-05-13 [Source: outlook_AAMkADAwNzg3ZTA5LTJmMWEtNDczNi04ODcxLTk1MTA1ODhmYmIyNABGAAAAAAAU1WTKtGciQa9go1eRAG9JBwD__y9hPlJRRYxFT5QN_MgoAAAAAAEJAAD__y9hPlJRRYxFT5QN_MgoAAQmLY4sAAA=]
5. **Email: Re: Superior Beverage Product on Tray** — 2026-05-13 [Source: outlook_AAMkADAwNzg3ZTA5LTJmMWEtNDczNi04ODcxLTk1MTA1ODhmYmIyNABGAAAAAAAU1WTKtGciQa9go1eRAG9JBwD
```

### 02-teams-search - PASS

```text
Captured the request packet: Search Teams context for JobPlanner or Brandon discussion. I need the actual Team....

Packet: /ai-assistant/feature-requests/e9edea71-9582-464d-9119-f8caa9ce5bc8

I stopped at packet capture so this turn does not time out while also generating plans, Linear drafts, or handoffs.

Next step: open the packet, then run the implementation-plan/Linear/handoff actions from the packet widget when the scope is ready.
```

### 03-email-search - PASS

```text
Verdict: Meeting outcome / already completed share-out, not a valid internal Alleato task.

Evidence:
- In the meeting notes: “Reports and Exhibits Shared Ahead of Next Call” and specifically “GeoTech report and ExoTech action items were distributed for review.”
- In the transcript at 08:14, Speaker 3 says: “I provided the ExoTech action items…” and “I provided the GeoTech report.”
- The source title is an email thread (“FW: … Weekly TI Scope Meeting”), which suggests the documents were already circulated in recent email context before or with the meeting.

Email-derived context found:
- The meeting itself references a recent email exchange used to coordinate the Friday call: “Per our recent email exchange…”
- The forwarded email thread tied to the task source indicates the GeoTech report and ExoTech action items were already sent/distributed this week for participant review.
- Related email-driven follow-up mentioned in the same discussion: NDA comments had been returned that morning, and the team would review/turn them around.

Recommended correction:
- Remove this from internal open tasks, or mark it completed before creation.
- If anything should remain, recategorize it as a do
```

### 04-onedrive-spec-docs - PASS

```text
I checked the loaded source context, and there’s no document-derived evidence here to support an RFI or project-document summary.

What I can say with confidence:
- The current retrieval returned **0 matching source rows** from semantic search across **vectorized meetings, Teams, email, documents, insights, and memories**.
- So I do **not** have actual OneDrive/specification excerpts, document issue logs, or RFI-related document hits in the loaded evidence.
- I’m not going to invent a spec conflict, missing sheet, or document control issue without a source.

What that means:
- Either there truly aren’t any indexed document hits for this topic, or
- the likely problem is the sync pipeline. Your source health is already flagged **degraded**, with likely missing evidence at **embedding_backlog**.

What I checked
- **Source checked:** semantic search over available indexed sources
- **Result:** no matching document rows, no RFI-linked document context, no spec-derived issue evidence

My read:
- There is **no verified document-derived issue** I can summarize from the current evidence set.
- This is a data availability problem, not a project conclusion.

What to do next:
- If you want a 
```

### 05-project-filtered - PASS

```text
Project 67 — **Vermillion Rise Warehouse**: the latest RAG context says the job is still in **design coordination / preconstruction**, with the biggest immediate issue being **design quality and safety coordination**, not field execution. The most important update from today’s context is that **review drawing sets are expected by Friday**, but the team flagged **material sprinkler and electrical design problems** that need correction before those drawings can be relied on.

### What changed most recently
- **5/13 weekly call:** team committed to circulate **final review sets by Friday**; structural confirmation was still pending at the time of the meeting.
- The same meeting surfaced **sprinkler design errors**, including:
  - missing **double block valves**, creating flooding / water-damage exposure
  - **fire zones reduced from four to two**, with no documented agreement supporting that change
  - sprinkler header placement concerns
- **Electrical drawings also need more review**, with participants saying prior versions missed key intent and had meaningful discrepancies.
- On **5/12**, contract discussions on the **A141 agreement** advanced, including agreement around insurance t
```
