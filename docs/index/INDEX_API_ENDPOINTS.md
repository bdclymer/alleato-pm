| Path | Methods | Source |
| --- | --- | --- |
| /api/_archived/contracts | GET, POST | frontend/src/app/api/_archived/contracts/route.ts |
| /api/_archived/contracts/[id] | DELETE, GET, PUT | frontend/src/app/api/_archived/contracts/[id]/route.ts |
| /api/auth/signup | POST | frontend/src/app/api/auth/signup/route.ts |
| /api/change-orders | GET, POST | frontend/src/app/api/change-orders/route.ts |
| /api/change-orders/[id] | DELETE, GET, PUT | frontend/src/app/api/change-orders/[id]/route.ts |
| /api/clients | GET, POST | frontend/src/app/api/clients/route.ts |
| /api/commitments | GET, POST | frontend/src/app/api/commitments/route.ts |
| /api/commitments/[id] | DELETE, GET, PUT | frontend/src/app/api/commitments/[id]/route.ts |
| /api/commitments/[id]/attachments | DELETE, GET, POST | frontend/src/app/api/commitments/[id]/attachments/route.ts |
| /api/commitments/[id]/attachments/[attachmentId] | DELETE, GET | frontend/src/app/api/commitments/[id]/attachments/[attachmentId]/route.ts |
| /api/commitments/[id]/change-orders | GET, POST | frontend/src/app/api/commitments/[id]/change-orders/route.ts |
| /api/commitments/[id]/invoices | GET, POST | frontend/src/app/api/commitments/[id]/invoices/route.ts |
| /api/commitments/[id]/permanent-delete | DELETE | frontend/src/app/api/commitments/[id]/permanent-delete/route.ts |
| /api/commitments/[id]/restore | POST | frontend/src/app/api/commitments/[id]/restore/route.ts |
| /api/companies | GET, POST | frontend/src/app/api/companies/route.ts |
| /api/dev/schema | GET, POST | frontend/src/app/api/dev/schema/route.ts |
| /api/direct-costs | GET, POST | frontend/src/app/api/direct-costs/route.ts |
| /api/direct-costs/[id] | DELETE, GET, PATCH | frontend/src/app/api/direct-costs/[id]/route.ts |
| /api/docs-search | POST | frontend/src/app/api/docs-search/route.ts |
| /api/docs/check | GET | frontend/src/app/api/docs/check/route.ts |
| /api/documents/status | GET | frontend/src/app/api/documents/status/route.ts |
| /api/documents/trigger-pipeline | GET, POST | frontend/src/app/api/documents/trigger-pipeline/route.ts |
| /api/files/read | GET | frontend/src/app/api/files/read/route.ts |
| /api/health | GET | frontend/src/app/api/health/route.ts |
| /api/invoices | GET, POST | frontend/src/app/api/invoices/route.ts |
| /api/monitoring/dashboard | GET | frontend/src/app/api/monitoring/dashboard/route.ts |
| /api/monitoring/notify | GET, POST | frontend/src/app/api/monitoring/notify/route.ts |
| /api/monitoring/todo-integration | GET, POST | frontend/src/app/api/monitoring/todo-integration/route.ts |
| /api/monitoring/websocket | GET, OPTIONS, POST | frontend/src/app/api/monitoring/websocket/route.ts |
| /api/people | GET, POST | frontend/src/app/api/people/route.ts |
| /api/primitives/tool-calling | POST | frontend/src/app/api/primitives/tool-calling/route.ts |
| /api/procore-docs/ask | POST | frontend/src/app/api/procore-docs/ask/route.ts |
| /api/projects | GET, POST | frontend/src/app/api/projects/route.ts |
| /api/projects/[projectId] | GET, PATCH | frontend/src/app/api/projects/[projectId]/route.ts |
| /api/projects/[projectId]/budget | GET, POST | frontend/src/app/api/projects/[projectId]/budget/route.ts |
| /api/projects/[projectId]/budget-codes | GET, POST | frontend/src/app/api/projects/[projectId]/budget-codes/route.ts |
| /api/projects/[projectId]/budget/details | GET | frontend/src/app/api/projects/[projectId]/budget/details/route.ts |
| /api/projects/[projectId]/budget/direct-costs | GET | frontend/src/app/api/projects/[projectId]/budget/direct-costs/route.ts |
| /api/projects/[projectId]/budget/forecast | GET | frontend/src/app/api/projects/[projectId]/budget/forecast/route.ts |
| /api/projects/[projectId]/budget/history | GET | frontend/src/app/api/projects/[projectId]/budget/history/route.ts |
| /api/projects/[projectId]/budget/import | POST | frontend/src/app/api/projects/[projectId]/budget/import/route.ts |
| /api/projects/[projectId]/budget/lines/[lineId] | DELETE, PATCH | frontend/src/app/api/projects/[projectId]/budget/lines/[lineId]/route.ts |
| /api/projects/[projectId]/budget/lines/[lineId]/history | GET | frontend/src/app/api/projects/[projectId]/budget/lines/[lineId]/history/route.ts |
| /api/projects/[projectId]/budget/lock | DELETE, GET, POST | frontend/src/app/api/projects/[projectId]/budget/lock/route.ts |
| /api/projects/[projectId]/budget/modifications | DELETE, GET, PATCH, POST | frontend/src/app/api/projects/[projectId]/budget/modifications/route.ts |
| /api/projects/[projectId]/budget/snapshots | GET, POST | frontend/src/app/api/projects/[projectId]/budget/snapshots/route.ts |
| /api/projects/[projectId]/budget/views | GET, POST | frontend/src/app/api/projects/[projectId]/budget/views/route.ts |
| /api/projects/[projectId]/budget/views/[viewId] | DELETE, GET, PATCH | frontend/src/app/api/projects/[projectId]/budget/views/[viewId]/route.ts |
| /api/projects/[projectId]/budget/views/[viewId]/clone | POST | frontend/src/app/api/projects/[projectId]/budget/views/[viewId]/clone/route.ts |
| /api/projects/[projectId]/change-events | GET, POST | frontend/src/app/api/projects/[projectId]/change-events/route.ts |
| /api/projects/[projectId]/change-events/[changeEventId] | DELETE, GET, PATCH | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts |
| /api/projects/[projectId]/change-events/[changeEventId]/attachments | DELETE, GET, POST | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/route.ts |
| /api/projects/[projectId]/change-events/[changeEventId]/attachments/[attachmentId] | DELETE, GET | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/[attachmentId]/route.ts |
| /api/projects/[projectId]/change-events/[changeEventId]/attachments/[attachmentId]/download | GET | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/[attachmentId]/download/route.ts |
| /api/projects/[projectId]/change-events/[changeEventId]/history | GET | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/history/route.ts |
| /api/projects/[projectId]/change-events/[changeEventId]/line-items | GET, POST, PUT | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/route.ts |
| /api/projects/[projectId]/change-events/[changeEventId]/line-items/[lineItemId] | DELETE, GET, PATCH | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/[lineItemId]/route.ts |
| /api/projects/[projectId]/contracts | GET, POST | frontend/src/app/api/projects/[projectId]/contracts/route.ts |
| /api/projects/[projectId]/contracts/[contractId] | DELETE, GET, PUT | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/route.ts |
| /api/projects/[projectId]/contracts/[contractId]/change-orders | GET, POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/route.ts |
| /api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId] | DELETE, GET, PUT | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/route.ts |
| /api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/approve | POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/approve/route.ts |
| /api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/reject | POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/reject/route.ts |
| /api/projects/[projectId]/contracts/[contractId]/line-items | GET, POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/route.ts |
| /api/projects/[projectId]/contracts/[contractId]/line-items/[lineItemId] | DELETE, GET, PUT | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/[lineItemId]/route.ts |
| /api/projects/[projectId]/contracts/[contractId]/line-items/import | POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/import/route.ts |
| /api/projects/[projectId]/direct-costs | GET, POST | frontend/src/app/api/projects/[projectId]/direct-costs/route.ts |
| /api/projects/[projectId]/direct-costs/[costId] | DELETE, GET, PUT | frontend/src/app/api/projects/[projectId]/direct-costs/[costId]/route.ts |
| /api/projects/[projectId]/direct-costs/bulk | POST | frontend/src/app/api/projects/[projectId]/direct-costs/bulk/route.ts |
| /api/projects/[projectId]/direct-costs/export | POST | frontend/src/app/api/projects/[projectId]/direct-costs/export/route.ts |
| /api/projects/[projectId]/directory/companies | GET, POST | frontend/src/app/api/projects/[projectId]/directory/companies/route.ts |
| /api/projects/[projectId]/directory/companies/[companyId] | DELETE, GET, PATCH | frontend/src/app/api/projects/[projectId]/directory/companies/[companyId]/route.ts |
| /api/projects/[projectId]/directory/groups | GET, POST | frontend/src/app/api/projects/[projectId]/directory/groups/route.ts |
| /api/projects/[projectId]/directory/groups/[groupId] | DELETE, GET, PATCH | frontend/src/app/api/projects/[projectId]/directory/groups/[groupId]/route.ts |
| /api/projects/[projectId]/directory/groups/[groupId]/members | POST | frontend/src/app/api/projects/[projectId]/directory/groups/[groupId]/members/route.ts |
| /api/projects/[projectId]/directory/people | GET, POST | frontend/src/app/api/projects/[projectId]/directory/people/route.ts |
| /api/projects/[projectId]/directory/people/[personId] | DELETE, GET, PATCH | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/route.ts |
| /api/projects/[projectId]/directory/people/[personId]/deactivate | POST | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/deactivate/route.ts |
| /api/projects/[projectId]/directory/people/[personId]/email-notifications | GET, PATCH | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/email-notifications/route.ts |
| /api/projects/[projectId]/directory/people/[personId]/invite | POST | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/invite/route.ts |
| /api/projects/[projectId]/directory/people/[personId]/permissions | GET, PATCH | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/permissions/route.ts |
| /api/projects/[projectId]/directory/people/[personId]/reactivate | POST | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/reactivate/route.ts |
| /api/projects/[projectId]/directory/people/[personId]/reinvite | POST | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/reinvite/route.ts |
| /api/projects/[projectId]/directory/people/[personId]/resend-invite | POST | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/resend-invite/route.ts |
| /api/projects/[projectId]/directory/people/[personId]/schedule-notifications | GET, PATCH | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/schedule-notifications/route.ts |
| /api/projects/[projectId]/directory/permissions | DELETE, GET, PUT | frontend/src/app/api/projects/[projectId]/directory/permissions/route.ts |
| /api/projects/[projectId]/directory/roles | GET, POST, PUT | frontend/src/app/api/projects/[projectId]/directory/roles/route.ts |
| /api/projects/[projectId]/directory/users/bulk-add | POST | frontend/src/app/api/projects/[projectId]/directory/users/bulk-add/route.ts |
| /api/projects/[projectId]/purchase-orders | GET, POST | frontend/src/app/api/projects/[projectId]/purchase-orders/route.ts |
| /api/projects/[projectId]/subcontracts | GET, POST | frontend/src/app/api/projects/[projectId]/subcontracts/route.ts |
| /api/projects/[projectId]/vertical-markup | DELETE, GET, POST, PUT | frontend/src/app/api/projects/[projectId]/vertical-markup/route.ts |
| /api/projects/[projectId]/vertical-markup/calculate | POST | frontend/src/app/api/projects/[projectId]/vertical-markup/calculate/route.ts |
| /api/projects/bootstrap | POST | frontend/src/app/api/projects/bootstrap/route.ts |
| /api/rag-chat | POST | frontend/src/app/api/rag-chat/route.ts |
| /api/rag-chatkit | GET, POST | frontend/src/app/api/rag-chatkit/route.ts |
| /api/rag-chatkit/bootstrap | GET | frontend/src/app/api/rag-chatkit/bootstrap/route.ts |
| /api/rag-chatkit/state | GET | frontend/src/app/api/rag-chatkit/state/route.ts |
| /api/supabase-proxy/[...path] | DELETE, GET, HEAD, PATCH, POST, PUT | frontend/src/app/api/supabase-proxy/[...path]/route.ts |
| /api/table-update | POST | frontend/src/app/api/table-update/route.ts |
| /api/tool-calling | POST | frontend/src/app/api/tool-calling/route.ts |
