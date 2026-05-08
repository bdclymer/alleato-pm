# Silent/Fallback Debt Audit - 2026-05-08

This report identifies app-code patterns that can hide broken data paths or runtime failures. It is intentionally conservative: each finding needs human review before removal, but no finding should be treated as acceptable without a visible failure signal or telemetry.

## Summary

- Critical: 48
- High: 35
- Medium: 17
- Total: 100

## Required Policy

- No synthetic business data in production app paths.
- No silent catch blocks.
- No "best effort" path unless it records structured evidence and the user-facing workflow remains truthful.
- Empty real data is acceptable. Fake substitute data is not.

## Findings

| Severity | Category | Location | Evidence | Recommended action |
|---|---|---|---|---|
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/admin/company-info/page.tsx:639` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `synthetic-data` | `frontend/src/app/(admin)/design-ideas/_sections/reference-components.tsx:19` | // Sample data for table demo | Remove synthetic data and make the route/component show real empty/error state. |
| CRITICAL | `synthetic-data` | `frontend/src/app/(admin)/design-system-update/page.tsx:10` | // MOCK DATA | Remove synthetic data and make the route/component show real empty/error state. |
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/design-violations/page.tsx:78` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/feedback-inbox/page.tsx:270` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/feedback-inbox/page.tsx:648` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/feedback-inbox/page.tsx:664` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/feedback-inbox/page.tsx:1136` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/feedback-inbox/page.tsx:1206` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/feedback-inbox/page.tsx:1244` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/feedback-inbox/page.tsx:1273` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/rag-eval/page.tsx:544` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/test-matrix/page.tsx:139` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/test-matrix/page.tsx:204` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/test-matrix/page.tsx:266` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/(admin)/test-matrix/page.tsx:284` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/admin/prp-status/route.ts:88` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/admin/rag-eval/run/route.ts:141` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/dev-panel/annotations/route.ts:21` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/dev-panel/gaps/[feature]/route.ts:77` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/dev-panel/gaps/[feature]/route.ts:92` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/dev-panel/gaps/[feature]/route.ts:123` | } catch { /* ignore */ } | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/dev-panel/gaps/[feature]/route.ts:135` | } catch { /* ignore */ } | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/dev-panel/spec/[feature]/route.ts:40` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/dev-panel/spec/[feature]/route.ts:51` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/dev/annotate/route.ts:55` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/dev/violations/route.ts:43` | } catch { /* non-fatal */ } | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/liveblocks-auth/route.ts:55` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/liveblocks/webhook/route.ts:153` | } catch { /* enrichment is best-effort */ } | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/app/api/monitoring/websocket/route.ts:100` | } catch (error) { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `synthetic-data` | `frontend/src/components/ai-chat/sidebar-history.tsx:113` | fallbackData: [], | Remove synthetic data and make the route/component show real empty/error state. |
| CRITICAL | `silent-catch` | `frontend/src/components/dev-panel/AnnotationsTab.tsx:52` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/components/dev/design-violation-overlay.tsx:59` | } catch {} | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/components/dev/design-violation-overlay.tsx:123` | } catch { /* silent */ } | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/components/dev/design-violation-overlay.tsx:153` | try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch {} | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/components/dev/design-violation-overlay.tsx:292` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/components/dev/dev-annotation-overlay.tsx:59` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/components/dev/dev-annotation-overlay.tsx:90` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/components/dev/dev-annotation-overlay.tsx:114` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/components/dev/UnifiedFeedbackWidget.tsx:56` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/components/project/create-project-dev-config.tsx:68` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `synthetic-data` | `frontend/src/hooks/use-artifact.ts:26` | fallbackData: initialArtifactData, | Remove synthetic data and make the route/component show real empty/error state. |
| CRITICAL | `synthetic-data` | `frontend/src/hooks/use-artifact.ts:44` | fallbackData: initialArtifactData, | Remove synthetic data and make the route/component show real empty/error state. |
| CRITICAL | `synthetic-data` | `frontend/src/hooks/use-artifact.ts:76` | fallbackData: null, | Remove synthetic data and make the route/component show real empty/error state. |
| CRITICAL | `synthetic-data` | `frontend/src/hooks/use-chat-visibility.ts:27` | fallbackData: initialVisibilityType, | Remove synthetic data and make the route/component show real empty/error state. |
| CRITICAL | `silent-catch` | `frontend/src/lib/ai/tools/action-tools.ts:716` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/lib/ai/tools/action-tools.ts:2061` | } catch { | Add structured reporting or rethrow with a typed error. |
| CRITICAL | `silent-catch` | `frontend/src/lib/db/helpers/01-core-to-parts.ts:210` | //         } catch (error) { | Add structured reporting or rethrow with a typed error. |
| HIGH | `silent-language` | `backend/src/services/pipeline/llm.py:21` | # which would silently fail or truncate for small models (max 1536). | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `backend/src/services/pipeline/llm.py:31` | # which would silently fail or truncate for small models (max 1536). | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `backend/src/services/scheduler.py:89` | while silently skipping every run. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/app/(admin)/admin/company-info/page.tsx:640` | // Silently handle error | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/app/(admin)/updates/page.tsx:219` | "Fixed DirectCostForm hanging on creation. Resolved race condition in cost code lookup that caused the submit handler to silently fail.", | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/app/(main)/[projectId]/budget/page.tsx:199` | // Intentionally swallowed: lock status fetch is non-critical | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/app/(main)/page.tsx:530` | // Intentionally swallowed: UI shows empty state on error | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/app/api/projects/[projectId]/budget/snapshots/route.ts:99` | // surface it as an API error — do not ship zeroed totals silently | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/commitment-pcos/route.ts:23` | // Use service client so RLS doesn't silently filter junction table rows. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/prime-pcos/route.ts:23` | // Use service client so RLS doesn't silently filter junction table rows. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/app/api/projects/[projectId]/rfis/[rfiId]/route.ts:207` | // silently succeed without a traceable email send. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/app/api/projects/[projectId]/vendors/route.ts:85` | // silently 404'd because only GET was defined. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/components/budget/budget-line-item-form.tsx:236` | // Intentionally swallowed: form shows with empty cost codes dropdown | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/components/budget/original-budget-edit-modal.tsx:198` | // Intentionally swallowed: onSave callback handles error notifications | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/components/budget/unlock-budget-dialog.tsx:65` | // If we can't load modifications, don't silently allow unlock — | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/components/dev/dev-annotation-overlay.tsx:91` | // Screenshot is optional — fail silently | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/components/directory/DirectoryFilters.tsx:145` | // Intentionally swallowed: component shows appropriate state on error | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/components/directory/PersonEditDialog.tsx:161` | // Intentionally swallowed: error handling done by caller | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/components/directory/settings/PermissionsTableTab.tsx:57` | // Intentionally swallowed: updatePermission handles error notifications | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/components/domain/change-events/change-event-form/AddCompanyModal.tsx:61` | // instead of swallowing the failure silently (per CLAUDE.md Rule 2). | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/components/domain/change-events/ChangeEventRevenueSection.tsx:78` | // Intentionally swallowed: error handling done by caller | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/components/project-home/inline-team-member-form.tsx:96` | // Intentionally swallowed: component shows appropriate state on error | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/lib/ai/agents/cfo.ts:30` | What's committed but not yet billed? What change events exist without corresponding change orders? What change orders exist without matching commitment adjustments? These are the areas where money can silently disappear. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/lib/ai/agents/chro.ts:170` | - NEVER ask the user for a project ID — use projectName to resolve silently. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/lib/ai/agents/coo.ts:214` | - NEVER ask the user for a project ID — use projectName to resolve silently. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/lib/ai/agents/cro.ts:184` | - NEVER ask the user for a project ID — use projectName to resolve silently. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/lib/ai/agents/strategist.ts:327` | - **Never ask for IDs.** Users think in names. Use \`findProject\` or \`projectName\` parameters to resolve names to IDs silently. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/lib/ai/agents/strategist.ts:363` | - NEVER ask the user for a project ID, meeting ID, or any internal identifier. Resolve names to IDs using your tools silently. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/lib/ai/agents/strategist.ts:365` | - NEVER fail silently on search. If one search method fails, try another (keyword → semantic → broader terms). Only report failure after exhausting options. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/lib/ai/agents/vpbd.ts:175` | - NEVER ask the user for a project ID — use projectName or phase filters to resolve silently. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/lib/ai/orchestrator.ts:587` | // Rule 1: do not silently swallow. Log and proceed with empty history | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/lib/ai/session-id.ts:12` | *   the uuid type check, every insert silently rejects, and zero bot | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/lib/ai/tools/operational.ts:1777` | // Postgres rejects dimension mismatches — every call was silently failing. | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/lib/auto-sitemap-utils.ts:192` | // Intentionally swallowed: individual file errors should not stop sitemap generation | Replace hidden failure path with telemetry and user-visible degraded state. |
| HIGH | `silent-language` | `frontend/src/lib/schemas/common.ts:13` | * range validations silently. | Replace hidden failure path with telemetry and user-visible degraded state. |
| MEDIUM | `best-effort` | `backend/src/services/ingestion/fireflies_pipeline.py:412` | # Runs best-effort: failures don't block ingestion. | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `backend/src/services/intelligence/compiler.py:161` | # actual compiler exception with a best-effort metadata write failure. | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `backend/src/services/intelligence/email_compiler.py:1116` | # Best-effort error status — only on the head doc to avoid cascading failure writes. | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/app/api/liveblocks/webhook/route.ts:153` | } catch { /* enrichment is best-effort */ } | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/app/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/attachments/[attachmentId]/route.ts:67` | // Delete DB row first; storage removal is best-effort cleanup | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/app/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/attachments/[attachmentId]/route.ts:81` | // Remove from storage (best-effort — log errors but don't fail the request) | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/attachments/[attachmentId]/route.ts:83` | // Best-effort: remove from storage (derive path from public URL) | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/obsolete/route.ts:35` | // Record change history (best-effort — don't fail the request if this errors) | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/obsolete/route.ts:76` | // Record change history (best-effort — don't fail the request if this errors) | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/publish/route.ts:35` | // Record change history (best-effort — don't fail the request if this errors) | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/publish/route.ts:77` | // Record change history (best-effort — don't fail the request if this errors) | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/sketches/[sketchId]/route.ts:52` | // Attempt to remove from storage (best-effort, don't fail if missing) | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/route.ts:195` | // Record change history (best-effort — don't fail the request if this errors) | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments/[attachmentId]/route.ts:49` | // Delete DB row first; storage removal is best-effort cleanup | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments/[attachmentId]/route.ts:63` | // Remove from storage (best-effort — log errors but don't fail the request) | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/app/api/projects/[projectId]/prime-contract-pcos/[pcoId]/route.ts:134` | // Resolve creator display name (best effort) | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
| MEDIUM | `best-effort` | `frontend/src/lib/acumatica/sync-service.ts:1396` | // via vendor_id matching (best-effort, not always deterministic). | Verify this non-blocking path records evidence and has an owner-visible failure signal. |
