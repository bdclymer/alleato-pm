# Production RAG Smoke - 2026-05-13T23-08-02-494Z

- Endpoint: https://projects.alleatogroup.com/api/ai-assistant/chat
- Deployment checked: projects.alleatogroup.com production
- Total: 3
- Pass: 2
- Fail: 1

| Case | Status | HTTP | Duration | Tools | Source signals | Project ids | Failures |
|---|---|---:|---:|---|---|---|---|
| 01-broad-semantic-retry | FAIL | 200 | 6.0s | intentPlanner, assistantSourceHealth, sourceSpecificRagRetrieval | teams_chat_export, user:njepson@alleatogroup.com, user:mparsons@alleatogroup.com, user:jdawson@alleatogroup.com, outlook_email, njepson@alleatogroup.com, mparsons@alleatogroup.com, jdawson@alleatogroup.com, ctragesser@alleatogroup.com, crusin@alleatogroup.com, Teams DM export: njepson@alleatogroup.com, Teams DM export: mparsons@alleatogroup.com | 67 | missing required source signal: Meeting; missing required source signal: Email |
| 02-teams-search-retry | PASS | 200 | 28.0s | intentPlanner, assistantSourceHealth, assistantWidgetPlanner, semanticSearch, sourceLookupIntentRouter, mcpToolDiscovery, mcpToolDiscovery, streamingToolPolicy | teams_chat_export, user:njepson@alleatogroup.com, user:mparsons@alleatogroup.com, user:jdawson@alleatogroup.com, outlook_email, njepson@alleatogroup.com, mparsons@alleatogroup.com, jdawson@alleatogroup.com, ctragesser@alleatogroup.com, crusin@alleatogroup.com, Teams DM export: njepson@alleatogroup.com, Teams DM export: mparsons@alleatogroup.com | - | - |
| 03-email-search-retry | PASS | 200 | 30.7s | intentPlanner, assistantSourceHealth, semanticSearch, sourceLookupIntentRouter, mcpToolDiscovery, mcpToolDiscovery, streamingToolPolicy | teams_chat_export, user:njepson@alleatogroup.com, user:mparsons@alleatogroup.com, user:jdawson@alleatogroup.com, outlook_email, njepson@alleatogroup.com, mparsons@alleatogroup.com, jdawson@alleatogroup.com, ctragesser@alleatogroup.com, crusin@alleatogroup.com, Teams DM export: njepson@alleatogroup.com, Teams DM export: mparsons@alleatogroup.com | - | - |

## Answer Previews

### 01-broad-semantic-retry - FAIL

```text
**Last Five Emails in Supabase**

1. **Email: VERMILLION FOUNDATIONS (REDLINE)** — 2026-05-12 [Source: outlook_AAMkADAwNzg3ZTA5LTJmMWEtNDczNi04ODcxLTk1MTA1ODhmYmIyNABGAAAAAAAU1WTKtGciQa9go1eRAG9JBwD__y9hPlJRRYxFT5QN_MgoAAAAAAEMAAD__y9hPlJRRYxFT5QN_MgoAAQk4VakAAA=]
2. **Email: RE: Hillsdale-Alleato A141** — 2026-05-12 [Source: outlook_AAMkADAwNzg3ZTA5LTJmMWEtNDczNi04ODcxLTk1MTA1ODhmYmIyNABGAAAAAAAU1WTKtGciQa9go1eRAG9JBwD__y9hPlJRRYxFT5QN_MgoAAAAAAEMAAD__y9hPlJRRYxFT5QN_MgoAAQk4VaaAAA=]
3. **Email: Hillsdale-Alleato A141** — 2026-05-11 [Source: outlook_AAMkADAwNzg3ZTA5LTJmMWEtNDczNi04ODcxLTk1MTA1ODhmYmIyNABGAAAAAAAU1WTKtGciQa9go1eRAG9JBwD__y9hPlJRRYxFT5QN_MgoAAAAAAEMAAD__y9hPlJRRYxFT5QN_MgoAAQk4VZsAAA=]
4. **Email: Vermillian Rise Contract Review** — 2026-05-11 [Source: outlook_AAMkADAwNzg3ZTA5LTJmMWEtNDczNi04ODcxLTk1MTA1ODhmYmIyNABGAAAAAAAU1WTKtGciQa9go1eRAG9JBwD__y9hPlJRRYxFT5QN_MgoAAAAAAEJAAD__y9hPlJRRYxFT5QN_MgoAAQk4X_zAAA=]
5. **Email: Canceled: Vermillian Rise Contract Review** — 2026-05-11 [Source: outlook_AAMkADAwNzg3ZTA5LTJmMWEtNDczNi04ODcxLTk1MTA1ODhmYmIyNABGAAAAAAAU1WTKtGciQa9go1eRAG9JBwD__y9hPlJRRYxFT5QN_MgoAAAAAAEJAAD__y9hPlJRRYxFT5QN_MgoAAQk4X_3AAA=]

**Observability**

```

### 02-teams-search-retry - PASS

```text
I searched the indexed source set available in this session, and there’s no Teams direct-message evidence loaded here about **May 13 videographers** or a **calendar invite**.

What I can say, based on the retrieval state:
- The source lookup returned **0 matching source rows** for that question.
- I’m not going to invent a summary or blur in email/meeting evidence, since you asked for **Teams evidence only**.
- There’s also a known sync issue on some Teams DM exports, so thin retrieval here may be a pipeline problem, not proof the conversation didn’t happen.

What this means:
- I can’t confirm who said what, whether videographers were discussed, or whether someone referenced a calendar invite from the indexed Teams DM record set currently loaded.

Next move:
- Re-run the search with tighter terms like **“videographer”**, **“videographers”**, **“calendar invite”**, **“invite”**, or the specific people involved, or check whether the relevant Teams DM export finished syncing. If you want, I can work from a narrower person/date scope next.
```

### 03-email-search-retry - PASS

```text
I searched the indexed source set that’s loaded in this session, and there’s no retrievable Outlook email record for a thread titled **“Timeco System Launch and Project Dropdown List”**.

What that means:
- I can’t honestly summarize that thread from email evidence only because **no matching indexed email rows were returned**.
- The environment also shows **degraded Outlook sync/index health** with likely **embedding backlog**, so this may be a pipeline gap rather than proof the thread doesn’t exist.

What I can say with confidence:
- **No indexed RAG Outlook evidence is available here for that thread right now.**
- Because of that, any summary would be guesswork, and I’m not going to do that.

The issue is probably one of these:
- the thread exists in Outlook but **hasn’t been embedded/indexed yet**
- the subject line is slightly different than the phrasing you used
- the email is in a mailbox/source currently affected by the sync issues called out in the source health

Next move:
- If you want, give me the **sender name, approximate date, or a distinctive phrase from the email body/subject**, and I’ll narrow it to what’s actually in the indexed record set.
- Or, if you want the o
```
