# Brandon Feedback Verification Report

Generated: 2026-07-06
Source export: `docs/ops/evidence/2026-07-06-brandon-feedback-verification/export/brandon-feedback-unverified-export.json`
In-scope count: 26 Brandon Clymer feedback inbox rows not marked `closed` / `verified`

## Evidence captured this run

- Change Events:
  - `browser/change-events/change-events-list.png`
  - `browser/change-events/change-events-detail.png`
  - `browser/change-events/change-events-cluster.webm`
  - `browser/change-events/commitment-cco-590-fresh.png`
- Submittals:
  - `browser/submittals/submittals-list.png`
  - `browser/submittals/submittals-settings-tab.png`
  - `browser/submittals/submittal-detail.png`
  - `browser/submittals/submittal-detail-export-menu.png`
  - `browser/submittals/submittal-email-dialog.png`
  - `browser/submittals/submittals-cluster.webm`
- Drawings:
  - `browser/drawings/drawings-list.png`
  - `browser/drawings/drawings-cluster.webm`
- RFIs:
  - `browser/rfis/rfis-list.png`
  - `browser/rfis/rfis-new.png`
  - `browser/rfis/rfis-cluster.webm`
- Meetings:
  - `browser/meetings/project-meetings-list.png`
  - `browser/meetings/meetings-cluster.webm`
- Budget:
  - `browser/budget/budget-page.png`
- Tasks:
  - `browser/tasks/tasks-list.png`
  - `browser/tasks/tasks-cluster.webm`
- Progress Reports:
  - `browser/progress-reports/progress-report-876-fresh.png`

## Verdict key

- `Verified fixed`: Fresh route-level proof from this run shows the requested capability exists.
- `Not fixed`: Fresh route-level proof from this run contradicts the claim or the named route is still visibly broken.
- `Deferred`: Still a product/design defer rather than a delivered fix.
- `Unproven`: The inbox status says resolved/deferred, but this run did not produce enough fresh route-level proof to call it truly done.

## Per-item verdicts

| GitHub | Feedback ID | Route | Inbox status | Fresh verdict | Fresh proof | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| #316 | `d9289401-e99a-47c6-afd1-56196b7aa220` | `/67/progress-reports/653b78c5-80f8-4fd3-b0f1-7cd7830a3bf8` | `resolved` | `Unproven` | Export only | Older project route not freshly proven in this pass. |
| #550 | `09a8dc23-05d6-452c-821c-1e9ee2875ff7` | `/876/change-events` | `deferred` | `Verified fixed` | `browser/change-events/change-events-list.png` | Fresh route shows a visible `Settings` tab on Change Events. |
| #551 | `7a93948f-0e50-4a73-b086-5f80e2f2d88a` | `/876/change-events` | `resolved` | `Unproven` | `browser/change-events/change-events-list.png` | Current list is present, but this proof does not resolve the broader “what is all this” information-shape complaint. |
| #552 | `195edb0e-7096-4d10-9d3a-a05a6e9e1154` | `/876/change-events` | `resolved` | `Unproven` | `browser/change-events/change-events-list.png` | The current list renders values, but this pass did not trace the exact 28k source complaint end to end. |
| #553 | `14b7a65a-a9d6-4ead-bb0a-9897873afe64` | `/876/change-events` | `resolved` | `Unproven` | `browser/change-events/change-events-list.png` | Fresh list evidence is suggestive, but I did not reproduce the exact markup-side behavior strongly enough to close it. |
| #555 | `2edfbc48-5062-4fed-ac25-ee79e3782209` | `/876/change-events/927f077e-3883-441c-b275-58b55a4f9db9` | `resolved` | `Not fixed` | `browser/change-events/change-events-detail.png` | Exact detail route still sits on `Loading...` in this run. |
| #558 | `842a7be8-db1f-4bf7-94c7-3dc7a6eb8caf` | `/876/budget` | `resolved` | `Unproven` | `browser/budget/budget-page.png` | Budget route stayed in skeleton/loading state during this pass. |
| #560 | `553d38bb-9d8c-4b5b-b89d-f198a5c562a4` | `/876/budget` | `resolved` | `Unproven` | `browser/budget/budget-page.png` | Same loading-state limitation as `#558`; no fresh proof of the forecasting-field correction. |
| #562 | `142d917a-20b1-4bed-88ec-6bbe13fefaab` | `/876/budget` | `resolved` | `Unproven` | `browser/budget/budget-page.png` | Export affordance was not freshly exercised because the page never settled beyond skeleton state. |
| #563 | `a7dd954b-ea09-4b56-888d-9f0aebf8bab5` | `/876/transmittals` | `resolved` | `Unproven` | Export only | No fresh route-level proof captured in this pass. |
| #564 | `02d2ddfc-40b0-4e97-9653-6b891c41bc83` | `/876/submittals` | `resolved` | `Verified fixed` | `browser/submittals/submittals-list.png` | Fresh route shows the `Settings` tab / submittal settings entry point. |
| #565 | `a6f0cbc2-a8d4-4643-9cc5-c4f1d575f583` | `/876/submittals` | `resolved` | `Unproven` | `browser/submittals/submittals-list.png` | Export affordance is visible, but this pass did not freshly prove both PDF and CSV outputs plus formatting. |
| #566 | `c3a39ca1-0d06-41f4-bc4b-ae57dbd1b18f` | `/876/submittals/e2b8898d-d3f8-4e63-b16a-61fa9f1e12c4` | `resolved` | `Unproven` | `browser/submittals/submittal-detail.png`, `browser/submittals/submittal-detail-export-menu.png`, `browser/submittals/submittal-email-dialog.png` | Export and email affordances are present with cover-sheet options, but this pass did not freshly validate the generated output branding. |
| #567 | `130de417-7918-407b-a3ac-c31ae70b1136` | `/876/submittals/e2b8898d-d3f8-4e63-b16a-61fa9f1e12c4` | `resolved` | `Unproven` | `browser/submittals/submittal-detail.png` | Detail route is live, but I did not freshly prove the full view-vs-edit/workflow-order behavior. |
| #568 | `f5f68473-9d9a-492a-a641-ed31756dc658` | `/876/rfis` | `resolved` | `Unproven` | `browser/rfis/rfis-list.png` | Fresh list page loaded with zero rows locally; no new export run proof captured in this pass. Prior July 3 audit had this as not fixed due CSV failure. |
| #569 | `36ab292c-dc5e-4201-949d-ca37d543836c` | `/876/rfis/new` | `resolved` | `Unproven` | `browser/rfis/rfis-new.png` | Create form is live, but I did not open the assignee picker and reconcile options to project membership. |
| #571 | `3547f4a8-f83e-4ead-96e7-e551d8602ced` | `/876/progress-reports/e3e0d19c-4739-44f0-bee9-91ddebeaca0b` | `resolved` | `Not fixed` | `browser/progress-reports/progress-report-876-fresh.png` | Exact route stayed in skeleton/loading state in this run. |
| #572 | `60d1eb91-bb99-47fb-97e6-b94fa6ca26ea` | `/876/documents` | `resolved` | `Unproven` | Export only | No fresh route-level proof captured in this pass. |
| #573 | `4684d472-3f6f-427e-9700-a4bd0b2d933c` | `/876/drawings` | `resolved` | `Unproven` | `browser/drawings/drawings-list.png` | Fresh route shows the page and export affordance, but local data was empty so output formatting was not freshly proven. |
| #574 | `99c648d3-c2ed-4155-ad83-ff0f043f5634` | `/876/drawings` | `resolved` | `Unproven` | `browser/drawings/drawings-list.png` | No fresh QR deep-link callback proof captured in this pass. Prior July 3 audit had this as not fixed. |
| #575 | `f34cecf5-a39a-4d69-a698-60fbd5c9519c` | `/876/drawings` | `resolved` | `Unproven` | `browser/drawings/drawings-list.png` | No fresh selected-cloud interaction proof captured in this pass. |
| #579 | `5af7be7e-2d6c-4a47-84be-e5e4c2769a74` | `/meetings` | `resolved` | `Unproven` | `browser/meetings/project-meetings-list.png` | Fresh route clearly shows a `Create meeting` action, but I did not complete the broader agenda/minutes workflow proof. |
| #582 | `4e5b3d5a-0a96-42a4-8a43-e9276ba3a4ca` | `/tasks` | `resolved` | `Not fixed` | `browser/tasks/tasks-list.png` | Tasks route was still visibly loading/spinning in this run instead of proving filter behavior. |
| #583 | `9183d571-3a34-433f-8a2e-bee83511a845` | `/tasks` | `resolved` | `Not fixed` | `browser/tasks/tasks-list.png` | Same route-level loading problem; no fresh proof of the contextual up-arrow feedback flow. |
| #590 | `0c3124bf-fe72-42f1-9a26-ede738af4538` | `/876/change-orders/commitment/aa35f3c3-5ec0-4568-b126-f8671b4791cc` | `resolved` | `Not fixed` | `browser/change-events/commitment-cco-590-fresh.png` | Exact commitment CCO route was still on `Loading...` in this run. |
| #594 | `526cdb7c-4ca2-4e9a-800e-f62303dc4c2a` | `/876/invoicing/subcontractor/8092` | `resolved` | `Unproven` | Export only | Fresh direct-route navigation was unstable (`ERR_ABORTED`), so no new visual proof of export parity was captured. |

## Current count snapshot

- `Verified fixed`: 2
- `Not fixed`: 5
- `Deferred`: 0
- `Unproven`: 19

## Bottom line

Most of the rows still not marked verified in the inbox are not actually proven done. Only two items in this pass reached a clean fresh verification bar:

- `#550` Change Events settings entry point
- `#564` Submittals settings entry point

Several rows are materially worse than their inbox status suggests because the exact route still loads indefinitely or never proved the requested workflow:

- `#555` Change Event detail
- `#571` Progress Report detail
- `#582` Tasks filters/context surface
- `#583` Tasks AI-context thumbs-up surface
- `#590` Commitment CCO detail

Several others have positive signs but still fall short of true proof:

- `#565`, `#566`, `#567` on Submittals
- `#568`, `#569` on RFIs
- `#573`, `#574`, `#575` on Drawings
- `#579` on Meetings
- `#594` on Subcontractor invoicing
