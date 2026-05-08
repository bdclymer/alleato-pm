# Type Escape Hatches & Fetch Violations — 2026-04-14

Audit of the four gates that guarantee type safety and error-message quality
across the Alleato PM frontend. All four scripts are in
`scripts/audits/` and were run against the tree at commit `84629b73`.

## Summary

| Check | Violations |
|-------|-----------:|
| Type escape hatches (`as any`, `as unknown as`, `@ts-*`, `: any`) | 696 |
| Untyped Supabase clients (`createClient()` without `<Database>`) | 160 |
| Raw internal `fetch("/api/...")` (Rule 13) | 336 |
| Raw external `fetch("https://...")` in API routes / lib (Rule 16) | 1 |

### Key findings

1. **`components/` and `lib/` are where the type system has eroded the most.**
   232 escape hatches live under `frontend/src/components` and 173 more under
   `frontend/src/lib`. Together those two directories account for **58% of
   all type escapes.**
2. **API route handlers (`app/api`) contain 148 type escape hatches** —
   including widespread `as any` on Supabase query builders. This is the
   phantom-table risk class: the database client is untyped (see next
   section), so engineers reach for `as any` to stop the type-checker
   complaining about shapes it cannot verify.
3. **160 `createClient()` calls have no `<Database>` generic.** Every one of
   those is a spot where the Supabase client returns `SupabaseClient<any, "public", any>`
   and any `.from("phantom_table")` call will silently compile.
4. **336 raw `fetch("/api/...")` calls.** Every one of these is a Rule 13
   violation that will produce generic "Failed to fetch" style errors instead
   of the real server error message. `components/` (126) and `app/(main)/`
   pages (76) are the worst offenders.
5. **Only 1 external `fetch()` in API routes** — `frontend/src/lib/documents/email.ts:44`
   calls `https://api.resend.com/emails` directly without timeout, retry, or
   request-id propagation.

---

## Type escape hatches

### By pattern

| Pattern | Count |
|---------|------:|
| `: any` (explicit annotation) | 326 |
| `as any` | 224 |
| `as unknown as` | 144 |
| `@ts-expect-error` | 1 |
| `@ts-nocheck` | 1 |

### By directory

| Directory | Count |
|-----------|------:|
| components | 232 |
| lib | 173 |
| app/api | 148 |
| app/(main) | 41 |
| hooks | 27 |
| services | 23 |
| types | 18 |
| app/(admin) | 12 |
| app/(chat) | 10 |
| features | 4 |
| server | 3 |
| artifacts | 2 |
| i18n.ts | 2 |
| app/(tables) | 1 |

### Detail

`file:line — pattern — line content`

```
frontend/src/app/(admin)/(procore)/crawled-pages/page.tsx:63 — : any — { icon: any; color: string; bgColor: string }
frontend/src/app/(admin)/(procore)/crawled-pages/page.tsx:184 — as any — const { data, error } = await (supabase as any)
frontend/src/app/(admin)/design-system-update/page.tsx:1 — @ts-nocheck — // @ts-nocheck
frontend/src/app/(admin)/procore-docs/[...slug]/page.tsx:29 — as any — const { data: article } = await (supabase as any)
frontend/src/app/(admin)/procore-docs/[...slug]/page.tsx:169 — as any — const { data } = await (supabase as any)
frontend/src/app/(admin)/procore-docs/page.tsx:207 — as any — (supabase as any)
frontend/src/app/(admin)/procore-docs/page.tsx:235 — as any — const base = (supabase as any)
frontend/src/app/(admin)/site-map/page.tsx:375 — as unknown as — const aVal = (a as unknown as Record<string, unknown>)[sortBy];
frontend/src/app/(admin)/site-map/page.tsx:376 — as unknown as — const bVal = (b as unknown as Record<string, unknown>)[sortBy];
frontend/src/app/(admin)/spreadsheet-demo/page.tsx:204 — as any — initialStorage={initialStorage as any}
frontend/src/app/(admin)/table-v2/page.tsx:278 — as any — onUpdate={updateCompany as any}
frontend/src/app/(admin)/table-v2/page.tsx:279 — as any — onDelete={deleteCompany as any}
frontend/src/app/(chat)/chat-tool/page.nonprod.tsx:66 — : any — (part: any) => part.type && part.type.startsWith("tool-"),
frontend/src/app/(chat)/chat-tool/page.nonprod.tsx:68 — : any — .map((part: any, index: number) => renderToolPart(part, index))}
frontend/src/app/(chat)/chat-tool/page.nonprod.tsx:75 — : any — .filter((part: any) => part.type === "text")
frontend/src/app/(chat)/chat-tool/page.nonprod.tsx:76 — : any — .map((part: any) => part.text)
frontend/src/app/(chat)/chat-tool/page.nonprod.tsx:107 — : any — .map((part: any) => (part.type === "text" ? part.text : null))
frontend/src/app/(chat)/rag/page.tsx:45 — : any — data.events.map((e: any) => ({
frontend/src/app/(chat)/rag/page.tsx:53 — : any — data.guardrails.map((g: any) => ({
frontend/src/app/(chat)/rag/page.tsx:79 — : any — bootstrap.events.map((e: any) => ({
frontend/src/app/(chat)/rag/page.tsx:88 — : any — bootstrap.guardrails.map((g: any) => ({
frontend/src/app/(chat)/simple-chat/page.nonprod.tsx:190 — as any — style={syntaxHighlighterStyle as any}
frontend/src/app/(main)/[projectId]/budget/setup/page.tsx:70 — as unknown as — (data as unknown as ProjectCostCode[])?.filter(
frontend/src/app/(main)/[projectId]/budget/setup/page.tsx:104 — as unknown as — (data as unknown as ProjectCostCode[])?.filter(
frontend/src/app/(main)/[projectId]/change-orders/page.tsx:47 — : any — const primeCOs: PrimeContractCO[] = (primeResponse.data || []).map((co: any) => ({
frontend/src/app/(main)/[projectId]/change-orders/page.tsx:69 — : any — const commitmentCOs: CommitmentCO[] = (commitmentResponse.data || []).map((co: any) => ({
frontend/src/app/(main)/[projectId]/client-dashboard/client-dashboard.tsx:39 — : any — project: any;
frontend/src/app/(main)/[projectId]/client-dashboard/client-dashboard.tsx:40 — : any — primeContract: any | null;
frontend/src/app/(main)/[projectId]/client-dashboard/client-dashboard.tsx:41 — : any — milestones: any[];
frontend/src/app/(main)/[projectId]/client-dashboard/client-dashboard.tsx:42 — : any — rfis: any[];
frontend/src/app/(main)/[projectId]/client-dashboard/client-dashboard.tsx:43 — : any — documents: any[];
frontend/src/app/(main)/[projectId]/commitment-pcos/[pcoId]/page.tsx:400 — as any — const lineItems = (pco as any).line_items as
frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/edit/page.tsx:174 — as unknown as — sovLines: sovLines as unknown as PurchaseOrderSovLineItem[],
frontend/src/app/(main)/[projectId]/estimates/new/page.tsx:57 — as any — resolver: zodResolver(EstimateCreateSchema) as any,
frontend/src/app/(main)/[projectId]/home/page.tsx:429 — as any — const { data: pendingSsovRows } = await (supabase as any)
frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:105 — : any — schedule?: any[];
frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:118 — : any — dailyLogs?: any[];
frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:119 — : any — budget?: any[];
frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:120 — : any — sov?: any[];
frontend/src/app/(main)/[projectId]/home/project-home-client.tsx:110 — : any — schedule?: any[];
frontend/src/app/(main)/[projectId]/home/project-home-client.tsx:111 — : any — sov?: any[];
frontend/src/app/(main)/[projectId]/home/project-home-client.tsx:900 — : any — const overdueTasks = schedule.filter((t: any) => t.end_date && new Date(t.end_date) < new Date() && t.status !== "completed" && t.status !== "complete" && t.status !== "done");
frontend/src/app/(main)/[projectId]/home/project-home-client.tsx:912 — : any — const completedTasks = allTasks.filter((t: any) => t.status === "completed" || t.status === "complete" || t.status === "done").length;
frontend/src/app/(main)/[projectId]/home/project-home-client.tsx:915 — : any — const overdueTasks = allTasks.filter((t: any) => { const endDate = t.end_date || t.due_date; if (!endDate) return false; return new Date(endDate) < new Date() && t.status !== "completed" && t.status !== "complete" && t.status !== "done"; })…
frontend/src/app/(main)/[projectId]/home/project-home-redesign.tsx:78 — : any — schedule?: any[];
frontend/src/app/(main)/[projectId]/home/project-home-redesign.tsx:79 — : any — sov?: any[];
frontend/src/app/(main)/[projectId]/home/project-home-redesign.tsx:307 — : any — const done = schedule.filter((t: any) => ["completed", "complete", "done"].includes(t.status)).length;
frontend/src/app/(main)/[projectId]/home/project-home-redesign.tsx:308 — : any — const overdue = schedule.filter((t: any) => {
frontend/src/app/(main)/[projectId]/home/project-home-redesign.tsx:314 — : any — .filter((t: any) => {
frontend/src/app/(main)/[projectId]/home/project-home-redesign.tsx:318 — : any — .sort((a: any, b: any) => new Date(a.end_date || a.due_date).getTime() - new Date(b.end_date || b.due_date).getTime())[0];
frontend/src/app/(main)/[projectId]/home/project-home-redesign.tsx:318 — : any — .sort((a: any, b: any) => new Date(a.end_date || a.due_date).getTime() - new Date(b.end_date || b.due_date).getTime())[0];
frontend/src/app/(main)/[projectId]/pcos/new/page.tsx:150 — as any — await createPCO.mutateAsync(buildPayload() as any);
frontend/src/app/(main)/[projectId]/pcos/new/page.tsx:180 — as any — } as any);
frontend/src/app/(main)/[projectId]/submittals/[submittalId]/edit/page.tsx:35 — as unknown as — submittal={submittal as unknown as SubmittalSummary}
frontend/src/app/(main)/[projectId]/submittals/page.tsx:240 — as unknown as — const itemAny = item as unknown as Record<string, unknown>;
frontend/src/app/(main)/[projectId]/submittals/page.tsx:666 — as unknown as — const val = (item as unknown as Record<string, unknown>)[c.id];
frontend/src/app/(main)/[projectId]/submittals/page.tsx:706 — as unknown as — const val = (item as unknown as Record<string, unknown>)[c.id];
frontend/src/app/(main)/create-project/page.tsx:79 — as any — resolver: zodResolver(createProjectSchema) as any,
frontend/src/app/(main)/create-project/page.tsx:83 — as any — const { DevAutoFillButton } = useDevAutoFill("project", form.setValue as any);
frontend/src/app/(main)/fm-global/form/actions.ts:331 — as unknown as — user_input: input as unknown as Json,
frontend/src/app/(main)/fm-global/form/actions.ts:332 — as unknown as — parsed_requirements: input as unknown as Json,
frontend/src/app/(main)/fm-global/form/actions.ts:334 — as unknown as — recommendations: recommendations as unknown as Json,
frontend/src/app/(main)/stats/page.tsx:637 — as unknown as — return (data || []) as unknown as Meeting[];
frontend/src/app/(tables)/projects/page.tsx:255 — : any — const mappedProjects: Project[] = refreshResult.data.map((p: any) => ({
frontend/src/app/api/admin/acumatica-outbound-logs/route.ts:180 — as any — (supabase as any)
frontend/src/app/api/admin/acumatica-outbound-logs/route.ts:189 — as any — (supabase as any)
frontend/src/app/api/admin/acumatica-outbound-logs/route.ts:198 — as any — (supabase as any)
frontend/src/app/api/admin/acumatica-outbound-logs/route.ts:205 — as any — (supabase as any)
frontend/src/app/api/admin/acumatica-outbound-logs/route.ts:212 — as any — (supabase as any)
frontend/src/app/api/admin/acumatica-outbound-logs/route.ts:219 — as any — (supabase as any)
frontend/src/app/api/admin/acumatica-outbound-logs/route.ts:361 — as any — const { data, error } = await (supabase as any)
frontend/src/app/api/ai-assistant/chat/route.ts:170 — as unknown as — tools: tools as unknown as ToolSet,
frontend/src/app/api/avatar/[personId]/route.ts:55 — as any — const { data, error } = await (serviceSupabase as any)
frontend/src/app/api/commitments/[commitmentId]/email/route.ts:171 — as any — await (supabase as any).from("email_logs").insert({
frontend/src/app/api/commitments/[commitmentId]/email/route.ts:240 — as any — const { data: totalsData } = await (supabase as any)
frontend/src/app/api/commitments/[commitmentId]/email/route.ts:249 — as any — const { data: sovItems } = await (supabase as any)
frontend/src/app/api/commitments/[commitmentId]/export/route.ts:245 — as any — const { data: totalsData } = await (supabase as any)
frontend/src/app/api/commitments/[commitmentId]/export/route.ts:254 — as any — const { data: sovItems } = await (supabase as any)
frontend/src/app/api/commitments/[commitmentId]/export/route.ts:267 — as any — const { data: projectData } = await (supabase as any)
frontend/src/app/api/commitments/[commitmentId]/export/route.ts:275 — as any — const { data: projectCompanyData } = await (supabase as any)
frontend/src/app/api/commitments/[commitmentId]/export/route.ts:293 — as any — const { data: invoicePeople } = await (supabase as any)
frontend/src/app/api/commitments/[commitmentId]/export/route.ts:311 — as any — const { data: vendorPeople } = await (supabase as any)
frontend/src/app/api/commitments/[commitmentId]/export/route.ts:330 — as any — const { data: createdByPerson } = await (supabase as any)
frontend/src/app/api/commitments/[commitmentId]/export/route.ts:382 — : any — line_items: (sovItems || []).map((item: any) => ({
frontend/src/app/api/commitments/[commitmentId]/invoices/route.ts:115 — as any — const { data: approvedSubmission, error: submissionError } = await (supabase as any)
frontend/src/app/api/commitments/[commitmentId]/invoices/route.ts:127 — as any — const { data, error } = await (supabase as any)
frontend/src/app/api/commitments/[commitmentId]/invoices/route.ts:142 — as any — const { data, error } = await (supabase as any)
frontend/src/app/api/commitments/[commitmentId]/route.ts:254 — as any — const { data: peopleData } = await (supabase as any)
frontend/src/app/api/commitments/[commitmentId]/route.ts:270 — as any — const { data: creatorData } = await (supabase as any)
frontend/src/app/api/commitments/route.ts:74 — : any — query: any,
frontend/src/app/api/commitments/route.ts:130 — as any — type: (row.company_type as any) || "vendor",
frontend/src/app/api/commitments/route.ts:242 — as any — let baseQuery = (supabase as any)
frontend/src/app/api/commitments/route.ts:266 — as any — ? (supabase as any)
frontend/src/app/api/commitments/route.ts:272 — as any — ? (supabase as any)
frontend/src/app/api/directory/companies/[companyId]/details/route.ts:124 — as any — (supabase as any)
frontend/src/app/api/directory/companies/[companyId]/details/route.ts:130 — as any — (supabase as any)
frontend/src/app/api/monitoring/todo-integration/route.ts:229 — : any — todo: any,
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:85 — as unknown as — const costCode = line.cost_codes as unknown as CostCodeRef | null;
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:123 — as unknown as — const costCode = mod.cost_codes as unknown as CostCodeRef | null;
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:124 — as unknown as — const modification = mod.budget_modifications as unknown as {
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:168 — as unknown as — const costCode = mod.cost_codes as unknown as CostCodeRef | null;
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:169 — as unknown as — const modification = mod.budget_modifications as unknown as {
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:207 — as unknown as — const contract = co.prime_contracts as unknown as {
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:226 — as any — await (supabase as any)
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:246 — as unknown as — const changeOrder = co.change_orders as unknown as {
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:289 — as unknown as — const subcontract = line.subcontracts as unknown as {
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:331 — as unknown as — const purchaseOrder = line.purchase_orders as unknown as {
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:380 — as unknown as — const costCode = co.cost_codes as unknown as CostCodeRef | null;
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:381 — as unknown as — const changeOrder = co.commitment_change_orders as unknown as {
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:469 — as unknown as — const directCost = line.direct_costs as unknown as
frontend/src/app/api/projects/[projectId]/budget/export/route.ts:90 — as any — let budgetLinesRes = await (supabase as any)
frontend/src/app/api/projects/[projectId]/budget/export/route.ts:125 — as any — (supabase as any)
frontend/src/app/api/projects/[projectId]/budget/export/route.ts:161 — as any — (supabase as any)
frontend/src/app/api/projects/[projectId]/budget/export/route.ts:233 — as unknown as — for (const cost of (directCostsRes.data || []) as unknown as Array<{
frontend/src/app/api/projects/[projectId]/budget/export/route.ts:400 — as unknown as — const exportData: ExportBudgetRow[] = ((budgetLinesRes.data || []) as unknown as Record<string, unknown>[]).map(
frontend/src/app/api/projects/[projectId]/budget/history/route.ts:84 — as unknown as — const budgetLine = change.budget_lines as unknown as {
frontend/src/app/api/projects/[projectId]/budget-codes/route.ts:282 — as unknown as — newProjectBudgetCode as unknown as ProjectBudgetCodeRow;
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/email/route.ts:22 — : any — function buildHtml(changeEvent: any, lineItems: any[], project: any): string {
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/email/route.ts:22 — : any — function buildHtml(changeEvent: any, lineItems: any[], project: any): string {
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/email/route.ts:22 — : any — function buildHtml(changeEvent: any, lineItems: any[], project: any): string {
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/email/route.ts:39 — : any — .map((item: any) => {
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/email/route.ts:74 — : any — const totalRevenueRom = lineItems.reduce((s: number, li: any) => s + (li.revenue_rom || 0), 0);
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/email/route.ts:75 — : any — const totalCostRom = lineItems.reduce((s: number, li: any) => s + (li.cost_rom || 0), 0);
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/email/route.ts:76 — : any — const totalNonCommitted = lineItems.reduce((s: number, li: any) => s + (li.non_committed_cost || 0), 0);
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/[lineItemId]/route.ts:238 — : any — const updates: any = {
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/pdf/route.ts:21 — : any — function buildHtml(changeEvent: any, lineItems: any[], project: any): string {
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/pdf/route.ts:21 — : any — function buildHtml(changeEvent: any, lineItems: any[], project: any): string {
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/pdf/route.ts:21 — : any — function buildHtml(changeEvent: any, lineItems: any[], project: any): string {
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/pdf/route.ts:38 — : any — .map((item: any) => {
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/pdf/route.ts:77 — : any — const totalRevenueRom = lineItems.reduce((s: number, li: any) => s + (li.revenue_rom || 0), 0);
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/pdf/route.ts:78 — : any — const totalCostRom = lineItems.reduce((s: number, li: any) => s + (li.cost_rom || 0), 0);
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/pdf/route.ts:79 — : any — const totalNonCommitted = lineItems.reduce((s: number, li: any) => s + (li.non_committed_cost || 0), 0);
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:164 — : any — const commitmentIds = [...new Set(lineItems.filter((li: any) => li.commitment_id).map((li: any) => li.commitment_id))] as string[];
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:164 — : any — const commitmentIds = [...new Set(lineItems.filter((li: any) => li.commitment_id).map((li: any) => li.commitment_id))] as string[];
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:183 — : any — (subs || []).forEach((s: any) => {
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:201 — : any — (pos || []).forEach((p: any) => {
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:268 — : any — const budgetLineIds = [...new Set(lineItems.filter((li: any) => li.budget_code_id).map((li: any) => li.budget_code_id))];
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:268 — : any — const budgetLineIds = [...new Set(lineItems.filter((li: any) => li.budget_code_id).map((li: any) => li.budget_code_id))];
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:286 — as any — for (const bl of budgetLines as any[]) {
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:287 — : any — const matchingPcc = projectCostCodes.find((pcc: any) =>
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:299 — : any — (sum: number, item: any) => sum + (item.revenue_rom || 0),
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:303 — : any — (sum: number, item: any) => sum + (item.cost_rom || 0),
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:307 — : any — (sum: number, item: any) => sum + (item.non_committed_cost || 0),
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:367 — as any — workflowStage: (changeEvent as any).workflow_stage ?? null,
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:382 — : any — lineItems: lineItems.map((item: any) => {
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:426 — : any — history: (changeEvent.change_event_history || []).map((entry: any) => ({
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts:611 — : any — lineItems: (data.change_event_line_items || []).map((item: any) => {
frontend/src/app/api/projects/[projectId]/commitment-pcos/route.ts:106 — : any — const result = enrichedPcos.map((pco: any) => ({
frontend/src/app/api/projects/[projectId]/commitment-pcos/route.ts:227 — as any — vendor_name: (s.vendor as any)?.name || null,
frontend/src/app/api/projects/[projectId]/commitment-pcos/route.ts:242 — as any — vendor_name: (p.vendor as any)?.name || null,
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/import/route.ts:77 — as any — const { data: commitment, error: commitmentError } = await (supabase as any)
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/import/route.ts:150 — as any — const { data: existingLineItems } = await (supabase as any)
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/import/route.ts:190 — as any — const { data: insertedItem, error: insertError } = await (supabase as any)
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/route.ts:87 — as any — const { data: lineItems, error: lineItemsError } = await (supabase as any)
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/route.ts:194 — as any — const { data: existingItems } = await (supabase as any)
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/route.ts:207 — as any — const { error: deleteError } = await (supabase as any)
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/route.ts:240 — as any — const { data: updatedItem, error: updateError } = await (supabase as any)
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/route.ts:254 — as any — const { data: insertedItem, error: insertError } = await (supabase as any)
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts:48 — : any — supabase: any,
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts:75 — : any — async function getCommitmentType(supabase: any, commitmentId: string) {
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts:87 — : any — async function getTargetAndSourceSov(supabase: any, commitmentId: string) {
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts:105 — : any — supabase: any,
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts:123 — : any — async function getActorRoleContext(supabase: any, authUserId: string, projectId: number, personId: string) {
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts:170 — : any — async function getInvoiceContactEmails(supabase: any, invoiceContactIds: string[]) {
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts:249 — : any — supabase: any;
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts:361 — : any — supabase: any;
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts:678 — : any — const mapped = sourceSov.map((row: any, index: number) => ({
frontend/src/app/api/projects/[projectId]/commitments/export/route.ts:186 — : any — supabase: any,
frontend/src/app/api/projects/[projectId]/commitments/export/route.ts:216 — : any — (scData || []).forEach((row: any) => {
frontend/src/app/api/projects/[projectId]/commitments/export/route.ts:244 — : any — (poData || []).forEach((row: any) => {
frontend/src/app/api/projects/[projectId]/commitments/export/route.ts:253 — : any — supabase: any,
frontend/src/app/api/projects/[projectId]/commitments/export/route.ts:322 — : any — commitment.sov_items = sovData.map((item: any) => ({
frontend/src/app/api/projects/[projectId]/commitments/export/route.ts:341 — : any — function mapRowToExport(row: any, type: 'subcontract' | 'purchase_order'): CommitmentExportRow {
frontend/src/app/api/projects/[projectId]/contacts/route.ts:51 — as unknown as — const rows = (data ?? []) as unknown as Array<{
frontend/src/app/api/projects/[projectId]/directory/companies/[companyId]/route.ts:263 — as any — const { error: deleteError } = await (supabase as any)
frontend/src/app/api/projects/[projectId]/directory/people/[personId]/profile-photo/route.ts:77 — as any — const { error: upsertError } = await (serviceSupabase as any)
frontend/src/app/api/projects/[projectId]/directory/people/[personId]/profile-photo/route.ts:90 — as any — await (serviceSupabase as any)
frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/pins/[pinId]/route.ts:24 — as any — .from("drawing_markup_pins" as any)
frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/pins/[pinId]/route.ts:26 — as any — .eq("id", pinId)) as any;
frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/pins/route.ts:25 — as any — .from("drawing_markup_pins" as any)
frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/pins/route.ts:28 — as any — .order("created_at", { ascending: true }) as any);
frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/pins/route.ts:52 — as any — .from("drawing_markup_pins" as any)
frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/pins/route.ts:68 — as any — .single()) as any;
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/related-items/options/route.ts:198 — as unknown as — const cc = r.cost_codes as unknown as { title?: string | null; division_title?: string | null } | null;
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/related-items/options/route.ts:205 — as unknown as — const cc = r.cost_codes as unknown as { id: string; title?: string | null; division_title?: string | null };
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/related-items/options/route.ts:289 — as unknown as — const d = r.drawings as unknown as { project_id: number; drawing_number?: string | null; title?: string | null } | null;
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/related-items/options/route.ts:296 — as unknown as — const d = r.drawings as unknown as { drawing_number?: string | null; title?: string | null };
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/route.ts:154 — as unknown as — const lineItems = enrichedLineItems as unknown as Array<{
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/submit/route.ts:154 — as unknown as — .maybeSingle() as unknown as Promise<{
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/submit/route.ts:168 — as unknown as — .eq("invoice_id", invoiceId) as unknown as Promise<{
frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/prep/generate/route.ts:74 — as any — const { data: digest } = await (serviceClient as any)
frontend/src/app/api/projects/[projectId]/pcos/[pcoId]/change-events/route.ts:51 — : any — (pce: any) => pce.change_event_id
frontend/src/app/api/projects/[projectId]/pcos/[pcoId]/change-events/route.ts:65 — : any — const result = (pcoChangeEvents || []).map((pce: any) => ({
frontend/src/app/api/projects/[projectId]/pcos/[pcoId]/route.ts:82 — : any — (pce: any) => pce.change_event_id
frontend/src/app/api/projects/[projectId]/pcos/[pcoId]/route.ts:96 — : any — const groupedChangeEvents = (pcoChangeEvents || []).map((pce: any) => ({
frontend/src/app/api/projects/[projectId]/specifications/route.ts:34 — as any — status: (searchParams.get("status") as any) || undefined,
frontend/src/app/api/projects/bootstrap/route.ts:24 — : any — project: any;
frontend/src/app/api/projects/bootstrap/route.ts:25 — : any — contract: any;
frontend/src/app/api/projects/bootstrap/route.ts:26 — : any — budgetCodes: any[];
frontend/src/app/api/projects/bootstrap/route.ts:27 — : any — budgetLineItems: any[];
frontend/src/app/api/projects/bootstrap/route.ts:28 — : any — commitment: any;
frontend/src/app/api/projects/bootstrap/route.ts:29 — : any — changeEvent: any;
frontend/src/app/api/projects/bootstrap/route.ts:30 — : any — changeOrder: any;
frontend/src/app/api/projects/bootstrap/route.ts:31 — : any — budgetModification: any;
frontend/src/app/api/rag-chatkit/route.ts:94 — : any — } catch (error: any) {
frontend/src/app/api/rag-chatkit/route.ts:173 — : any — } catch (error: any) {
frontend/src/app/api/testing/parity/route.ts:121 — as unknown as — const tc = r.test_cases as unknown as TC | null;
frontend/src/app/api/testing/runs/[runId]/results/route.ts:48 — as unknown as — let data: ResultRow[] | null = withDepth.data as unknown as ResultRow[] | null;
frontend/src/app/api/testing/runs/[runId]/results/route.ts:66 — as unknown as — data = fallback.data as unknown as ResultRow[] | null;
frontend/src/app/api/testing/runs/route.ts:60 — as unknown as — runs = fallbackRuns.data as unknown as typeof withDepthRuns.data;
frontend/src/app/api/testing/runs/route.ts:138 — as unknown as — cases = fallbackCases.data as unknown as typeof withDepthCases.data;
frontend/src/app/api/webhooks/resend/route.ts:59 — as unknown as — event = verified as unknown as { type: string; data: Record<string, unknown> };
frontend/src/artifacts/code/client.tsx:138 — as any — const currentPyodideInstance = await (globalThis as any).loadPyodide({
frontend/src/artifacts/code/client.tsx:197 — : any — } catch (error: any) {
frontend/src/components/ai/chat-voice.tsx:59 — as any — handleSubmit(e as any);
frontend/src/components/ai-assistant/chat-area.tsx:139 — as unknown as — .map((p) => p as unknown as ToolPart);
frontend/src/components/apps/calendar/components-apps-calendar.tsx:131 — : any — const dateFormat = (dt: any) => {
frontend/src/components/apps/calendar/components-apps-calendar.tsx:140 — : any — const editEvent = (data: any = null) => {
frontend/src/components/apps/calendar/components-apps-calendar.tsx:161 — : any — const editDate = (data: any) => {
frontend/src/components/apps/calendar/components-apps-calendar.tsx:221 — : any — const startDateChange = (event: any) => {
frontend/src/components/apps/calendar/components-apps-calendar.tsx:228 — : any — const changeValue = (e: any) => {
frontend/src/components/apps/calendar/components-apps-calendar.tsx:233 — : any — const toast: any = Swal.mixin({
frontend/src/components/apps/calendar/components-apps-calendar.tsx:290 — : any — eventClick={(event: any) => editEvent(event)}
frontend/src/components/apps/calendar/components-apps-calendar.tsx:291 — : any — select={(event: any) => editDate(event)}
frontend/src/components/apps/calendar/components-apps-calendar.tsx:361 — : any — onChange={(event: any) => startDateChange(event)}
frontend/src/components/apps/chat/components-apps-chat.tsx:296 — : any — const element: any = document.querySelector('.chat-conversation-box');
frontend/src/components/apps/chat/components-apps-chat.tsx:302 — : any — const selectUser = (user: any) => {
frontend/src/components/apps/chat/components-apps-chat.tsx:325 — : any — const sendMessageHandle = (event: any) => {
frontend/src/components/apps/chat/components-apps-chat.tsx:405 — : any — {filteredItems.map((person: any) => {
frontend/src/components/apps/chat/components-apps-chat.tsx:641 — : any — {selectedUser.messages.map((message: any, index: any) => {
frontend/src/components/apps/chat/components-apps-chat.tsx:641 — : any — {selectedUser.messages.map((message: any, index: any) => {
frontend/src/components/apps/chat/components-apps-chat.tsx:693 — : any — onChange={(e: any) => setTextMessage(e.target.value)}
frontend/src/components/apps/contacts/components-apps-contacts.tsx:31 — : any — const changeValue = (e: any) => {
frontend/src/components/apps/contacts/components-apps-contacts.tsx:188 — : any — return contactList.filter((item: any) => {
frontend/src/components/apps/contacts/components-apps-contacts.tsx:250 — : any — const editUser = (user: any = null) => {
frontend/src/components/apps/contacts/components-apps-contacts.tsx:260 — : any — const deleteUser = (user: any = null) => {
frontend/src/components/apps/contacts/components-apps-contacts.tsx:261 — : any — setFilteredItems(filteredItems.filter((d: any) => d.id !== user.id));
frontend/src/components/apps/contacts/components-apps-contacts.tsx:266 — : any — const toast: any = Swal.mixin({
frontend/src/components/apps/contacts/components-apps-contacts.tsx:325 — : any — {filteredItems.map((contact: any) => {
frontend/src/components/apps/contacts/components-apps-contacts.tsx:370 — : any — {filteredItems.map((contact: any) => {
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:982 — : any — const selectMail = (item: any) => {
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1017 — : any — const showTime = (item: any) => {
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1018 — : any — const displayDt: any = new Date(item.date);
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1019 — : any — const cDt: any = new Date();
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1032 — : any — const openMail = (type: string, item: any) => {
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1116 — : any — const saveMail = (type: any, id: any) => {
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1116 — : any — const saveMail = (type: any, id: any) => {
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1178 — : any — const getFileSize = (file_type: any) => {
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1202 — : any — const tabChanged = (tabType: any) => {
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1208 — : any — const changeValue = (e: any) => {
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1213 — : any — const handleCheckboxChange = (id: any) => {
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1215 — : any — setIds((value: any) => value.filter((d: any) => d !== id));
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1215 — : any — setIds((value: any) => value.filter((d: any) => d !== id));
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1236 — : any — const toast: any = Swal.mixin({
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1740 — : any — {pagedMails.map((mail: any) => {
frontend/src/components/apps/mailbox/components-apps-mailbox.tsx:1973 — : any — {selectedMail.attachments.map((attachment: any, i: number) => {
frontend/src/components/apps/mailbox/invoice/components-apps-invoice-add.tsx:26 — : any — maxId = items?.length ? items.reduce((max: number, character: any) => (character.id > max ? character.id : max), items[0].id) : 0;
frontend/src/components/apps/mailbox/invoice/components-apps-invoice-add.tsx:41 — : any — const removeItem = (item: any = null) => {
frontend/src/components/apps/mailbox/invoice/components-apps-invoice-add.tsx:42 — : any — setItems(items.filter((d: any) => d.id !== item.id));
frontend/src/components/apps/mailbox/invoice/components-apps-invoice-add.tsx:47 — : any — const item = list.find((d: any) => d.id === id);
frontend/src/components/apps/mailbox/invoice/components-apps-invoice-add.tsx:375 — : any — {items.map((item: any) => {
frontend/src/components/apps/mailbox/invoice/components-apps-invoice-edit.tsx:69 — : any — maxId = items?.length ? items.reduce((max: number, character: any) => (character.id > max ? character.id : max), items[0].id) : 0;
frontend/src/components/apps/mailbox/invoice/components-apps-invoice-edit.tsx:84 — : any — const removeItem = (item: any = null) => {
frontend/src/components/apps/mailbox/invoice/components-apps-invoice-edit.tsx:85 — : any — setItems(items.filter((d: any) => d.id !== item.id));
frontend/src/components/apps/mailbox/invoice/components-apps-invoice-edit.tsx:90 — : any — const item = items.find((d: any) => d.id === id);
frontend/src/components/apps/mailbox/invoice/components-apps-invoice-edit.tsx:418 — : any — {items.map((item: any, index: any) => {
frontend/src/components/apps/mailbox/invoice/components-apps-invoice-edit.tsx:418 — : any — {items.map((item: any, index: any) => {
frontend/src/components/apps/mailbox/invoice/components-apps-invoice-list.tsx:179 — : any — const deleteRow = (id: any = null) => {
frontend/src/components/apps/mailbox/invoice/components-apps-invoice-list.tsx:189 — : any — const ids = selectedRows.map((d: any) => {
frontend/src/components/apps/notes/components-apps-notes.tsx:326 — : any — const changeValue = (e: any) => {
frontend/src/components/apps/notes/components-apps-notes.tsx:331 — : any — const deleteNoteConfirm = (note: any) => {
frontend/src/components/apps/notes/components-apps-notes.tsx:336 — : any — const viewNote = (note: any) => {
frontend/src/components/apps/notes/components-apps-notes.tsx:341 — : any — const editNote = (note: any = null) => {
frontend/src/components/apps/notes/components-apps-notes.tsx:353 — : any — setNoteList(notesList.filter((d: any) => d.id !== deletedNote.id));
frontend/src/components/apps/notes/components-apps-notes.tsx:360 — : any — const toast: any = Swal.mixin({
frontend/src/components/apps/notes/components-apps-notes.tsx:497 — : any — {filterdNotesList.map((note: any) => {
frontend/src/components/apps/scrumboard/components-apps-scrumboard.tsx:83 — : any — const changeValue = (e: any) => {
frontend/src/components/apps/scrumboard/components-apps-scrumboard.tsx:105 — : any — const addEditProject = (project: any = null) => {
frontend/src/components/apps/scrumboard/components-apps-scrumboard.tsx:120 — : any — const toast: any = Swal.mixin({
frontend/src/components/apps/scrumboard/components-apps-scrumboard.tsx:269 — : any — {projectList.map((project: any) => {
frontend/src/components/apps/scrumboard/components-apps-scrumboard.tsx:310 — : any — const groupId: any = sortable.el.closest('[data-group]')?.getAttribute('data-group') || 0;
frontend/src/components/apps/scrumboard/components-apps-scrumboard.tsx:311 — : any — const newList = projectList.map((task: any) => {
frontend/src/components/apps/scrumboard/components-apps-scrumboard.tsx:327 — : any — {project.tasks.map((task: any) => {
frontend/src/components/apps/scrumboard/components-apps-scrumboard.tsx:336 — : any — task.tags.map((tag: any, i: any) => {
frontend/src/components/apps/scrumboard/components-apps-scrumboard.tsx:336 — : any — task.tags.map((tag: any, i: any) => {
frontend/src/components/apps/todolist/components-apps-todolist.tsx:445 — : any — const changeValue = (e: any) => {
frontend/src/components/apps/todolist/components-apps-todolist.tsx:466 — : any — setFilteredTasks([...res.filter((d: any) => d.title?.toLowerCase().includes(searchTask))]);
frontend/src/components/apps/todolist/components-apps-todolist.tsx:467 — : any — getPager(res.filter((d: any) => d.title?.toLowerCase().includes(searchTask)));
frontend/src/components/apps/todolist/components-apps-todolist.tsx:470 — : any — const getPager = (res: any) => {
frontend/src/components/apps/todolist/components-apps-todolist.tsx:537 — : any — const addEditTask = (task: any = null) => {
frontend/src/components/apps/todolist/components-apps-todolist.tsx:548 — : any — const deleteTask = (task: any, type: string = '') => {
frontend/src/components/apps/todolist/components-apps-todolist.tsx:553 — : any — setAllTasks(allTasks.filter((d: any) => d.id !== task.id));
frontend/src/components/apps/todolist/components-apps-todolist.tsx:568 — : any — allTasks.map((d: any) => {
frontend/src/components/apps/todolist/components-apps-todolist.tsx:582 — : any — const monthNames: any = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
frontend/src/components/apps/todolist/components-apps-todolist.tsx:594 — : any — const toast: any = Swal.mixin({
frontend/src/components/apps/todolist/components-apps-todolist.tsx:831 — : any — {pagedTasks.map((task: any) => {
frontend/src/components/artifact-actions.tsx:15 — : any — metadata: any;
frontend/src/components/budget/modals/OriginalBudgetModal.tsx:46 — : any — onSave: (data: any) => Promise<void>;
frontend/src/components/commitments/ExportDialog.tsx:92 — : any — const exportParams: any = {
frontend/src/components/components-widgets.tsx:49 — : any — const revenueChart: any = {
frontend/src/components/components-widgets.tsx:199 — : any — const salesByCategory: any = {
frontend/src/components/components-widgets.tsx:245 — : any — formatter: (val: any) => {
frontend/src/components/components-widgets.tsx:254 — : any — formatter: (w: any) => {
frontend/src/components/components-widgets.tsx:255 — : any — return w.globals.seriesTotals.reduce(function (a: any, b: any) {
frontend/src/components/components-widgets.tsx:255 — : any — return w.globals.seriesTotals.reduce(function (a: any, b: any) {
frontend/src/components/components-widgets.tsx:283 — : any — const dailySales: any = {
frontend/src/components/components-widgets.tsx:364 — : any — const totalOrders: any = {
frontend/src/components/components-widgets.tsx:419 — : any — const totalVisit: any = {
frontend/src/components/components-widgets.tsx:464 — : any — const paidVisit: any = {
frontend/src/components/components-widgets.tsx:509 — : any — const uniqueVisitorSeries: any = {
frontend/src/components/components-widgets.tsx:601 — : any — const followers: any = {
frontend/src/components/components-widgets.tsx:644 — : any — const referral: any = {
frontend/src/components/components-widgets.tsx:687 — : any — const engagement: any = {
frontend/src/components/dev-panel/CommentsTab.tsx:110 — as unknown as — void handleSubmit(e as unknown as React.FormEvent);
frontend/src/components/direct-costs/DirectCostForm.tsx:188 — as any — form.reset(testData as any)
frontend/src/components/direct-costs/DirectCostForm.tsx:203 — as any — const data = initialData as any
frontend/src/components/direct-costs/DirectCostForm.tsx:207 — : any — ? data.line_items.map((item: any) => ({
frontend/src/components/direct-costs/DirectCostForm.tsx:223 — as any — (mode === 'create' ? DirectCostCreateSchema : DirectCostUpdateSchema) as any
frontend/src/components/direct-costs/DirectCostForm.tsx:245 — as any — }) as any,
frontend/src/components/direct-costs/DirectCostForm.tsx:533 — as any — items={fields as any}
frontend/src/components/direct-costs/DirectCostForm.tsx:544 — as any — {(formErrors.line_items as any)?.root && (
frontend/src/components/direct-costs/DirectCostForm.tsx:548 — as any — {String((formErrors.line_items as any).root.message)}
frontend/src/components/direct-costs/DirectCostsImportDialog.tsx:149 — as any — const hasAmount = normalizedHeaders.some((header) => HEADER_ALIASES.amount.includes(header as any));
frontend/src/components/direct-costs/DirectCostsImportDialog.tsx:150 — as any — const hasStatus = normalizedHeaders.some((header) => HEADER_ALIASES.status.includes(header as any));
frontend/src/components/direct-costs/DirectCostsImportDialog.tsx:151 — as any — const hasType = normalizedHeaders.some((header) => HEADER_ALIASES.costType.includes(header as any));
frontend/src/components/direct-costs/LineItemsManager.tsx:543 — as any — const errors = (formErrors.line_items as any[] | undefined)?.[index]
frontend/src/components/directory/DistributionGroupDialog.tsx:77 — as any — resolver: zodResolver(formSchema) as any,
frontend/src/components/directory/DistributionGroupDialog.tsx:92 — as any — const metadata = (group as any).metadata || {};
frontend/src/components/directory/DistributionGroupDialog.tsx:119 — : any — const memberIds = members.map((m: any) => Number(m.person_id));
frontend/src/components/directory/DistributionGroupDialog.tsx:228 — as any — <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
frontend/src/components/directory/DistributionGroupDialog.tsx:251 — as any — onValueChange={field.onChange as any}
frontend/src/components/directory/PermissionTemplateDialog.tsx:135 — as any — resolver: zodResolver(formSchema) as any,
frontend/src/components/directory/PermissionTemplateDialog.tsx:300 — as any — <form onSubmit={form.handleSubmit(onSubmit as any)} className="flex-1 flex flex-col space-y-6 overflow-hidden">
frontend/src/components/directory/PermissionTemplateDialog.tsx:324 — as any — onValueChange={field.onChange as any}
frontend/src/components/directory/PermissionTemplateDialog.tsx:461 — as any — control={form.control as any}
frontend/src/components/document-preview.tsx:27 — : any — result?: any;
frontend/src/components/document-preview.tsx:28 — : any — args?: any;
frontend/src/components/document-preview.tsx:152 — : any — result: any;
frontend/src/components/domain/change-events/ChangeEventConvertDialog.tsx:121 — : any — primeContracts.forEach((contract: any) => {
frontend/src/components/domain/change-events/ChangeEventConvertDialog.tsx:141 — : any — commitments.forEach((commitment: any) => {
frontend/src/components/domain/change-events/ChangeEventGeneralInfoPanel.tsx:45 — as any — const totals = (changeEvent as any).totals ?? { revenueRom: "0", costRom: "0", nonCommittedCost: "0" };
frontend/src/components/domain/contracts/CreatePurchaseOrderForm.tsx:227 — as any — resolver: zodResolver(CreatePurchaseOrderSchema) as any,
frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractPcosSection.tsx:65 — as unknown as — (p) => (p as unknown as Record<string, unknown>).prime_contract_id === contractId,
frontend/src/components/domain/pcos/ChangeManagementWidget.tsx:87 — : any — renderItem: (item: any) => React.ReactNode;
frontend/src/components/domain/users/BulkAddUsersDialog.tsx:132 — as unknown as — (userEntry as unknown as Record<string, string>)[key] =
frontend/src/components/drawings/DrawingComments.tsx:22 — as any — <RoomProvider id={roomId} initialPresence={{ cursor: null }} initialStorage={{} as any}>
frontend/src/components/drawings/DrawingLogTable.tsx:26 — : any — onBulkAction: (action: string, selectedRows: any[]) => Promise<void>
frontend/src/components/drawings/DrawingLogTable.tsx:273 — as any — await onBulkAction("bulkDownload", selectedIds as any[]);
frontend/src/components/drawings/DrawingLogTable.tsx:280 — as any — await onBulkAction("bulkExport", selectedIds as any[]);
frontend/src/components/drawings/DrawingLogTable.tsx:287 — as any — await onBulkAction("bulkStatusUpdate", selectedIds as any[]);
frontend/src/components/drawings/DrawingLogTable.tsx:302 — : any — const handleRowAction = useCallback(async (action: string, rowData: any) => {
frontend/src/components/drawings/DrawingLogTable.tsx:353 — : any — const handleBulkAction = useCallback(async (action: string, selectedRows: any[]) => {
frontend/src/components/drawings/DrawingLogTable.tsx:426 — as unknown as — data={data as unknown as Record<string, unknown>[]}
frontend/src/components/drawings/DrawingViewer.tsx:93 — : any — onLoadSuccess?: (pdf: any) => void;
frontend/src/components/drawings/DrawingViewer.tsx:354 — : any — (pdf: any) => {
frontend/src/components/drawings/DrawingViewer.tsx:374 — : any — (page: any) => {
frontend/src/components/drawings/DrawingViewerWithComments.tsx:25 — : any — onLoadSuccess?: (pdf: any) => void;
frontend/src/components/drawings/DrawingViewerWithComments.tsx:48 — as any — <RoomProvider id={roomId} initialPresence={{ cursor: null }} initialStorage={{} as any}>
frontend/src/components/drawings/LinkPinModal.tsx:326 — as any — const items = Array.isArray(itemsRaw) ? itemsRaw : (itemsRaw as any)?.items ?? [];
frontend/src/components/dropdown.tsx:5 — : any — const Dropdown = (props: any, forwardedRef: any) => {
frontend/src/components/dropdown.tsx:5 — : any — const Dropdown = (props: any, forwardedRef: any) => {
frontend/src/components/dropdown.tsx:23 — : any — const handleDocumentClick = (event: any) => {
frontend/src/components/guards/permission-guard.tsx:73 — as any — const template = membership.permission_template as any;
frontend/src/components/issue-tracker/actions/liveblocks.ts:40 — as any — await liveblocks.initializeStorageDocument(roomId, toPlainLson(initialStorage) as any);
frontend/src/components/issue-tracker/components/Issue.tsx:49 — : any — let storage: any;
frontend/src/components/issue-tracker/components/Issue.tsx:53 — : any — const emptyStorage: any = {
frontend/src/components/issue-tracker/components/IssueProperties.tsx:100 — as any — items={PROGRESS_STATES as any}
frontend/src/components/issue-tracker/components/IssueProperties.tsx:110 — as any — items={PRIORITY_STATES as any}
frontend/src/components/language-dropdown.tsx:52 — : any — {themeConfig.languageList.map((item: any) => {
frontend/src/components/layouts/header.tsx:46 — : any — const all: any = document.querySelectorAll('ul.horizontal-menu .nav-link.active');
frontend/src/components/layouts/header.tsx:58 — : any — const ul: any = selector.closest('ul.sub-menu');
frontend/src/components/layouts/header.tsx:60 — : any — let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link');
frontend/src/components/layouts/header.tsx:83 — : any — function createMarkup(messages: any) {
frontend/src/components/layouts/header.tsx:258 — : any — {themeConfig.languageList.map((item: any) => {
frontend/src/components/layouts/sidebar.tsx:55 — : any — const ul: any = selector.closest('ul.sub-menu');
frontend/src/components/layouts/sidebar.tsx:57 — : any — let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
frontend/src/components/meetings/edit-meeting-modal.tsx:116 — as unknown as — setProjectOptions(data as unknown as typeof projectOptions);
frontend/src/components/misc/chatkit-panel.tsx:11 — : any — onRunnerEventDelta?: (events: any[]) => void;
frontend/src/components/misc/chatkit-panel.tsx:72 — : any — onThreadChange: ({ threadId }: { threadId: any }) => onThreadChange?.(threadId ?? null),
frontend/src/components/misc/chatkit-panel.tsx:74 — : any — onError: ({ error }: { error: any }) => {
frontend/src/components/misc/chatkit-panel.tsx:76 — : any — onEffect: async ({ name }: { name: any }) => {
frontend/src/components/misc/chatkit-panel.tsx:81 — as any — onRunnerEventDelta?.((arguments as any)?.[0]?.data?.events ?? []);
frontend/src/components/misc/chatkit-panel.tsx:84 — as any — const tid = (arguments as any)?.[0]?.data?.thread_id;
frontend/src/components/misc/conversation-context.tsx:12 — : any — const formatValue = (value: any) => {
frontend/src/components/misc/results-table.tsx:14 — : any — data: any[];
frontend/src/components/misc/results-table.tsx:15 — : any — onRowClick?: (row: any) => void;
frontend/src/components/misc/runner-output.tsx:39 — : any — function inlineValue(value: any) {
frontend/src/components/misc/runner-output.tsx:55 — : any — function tryParseJson(value: any) {
frontend/src/components/misc/sidebar-left.tsx:77 — as any — icon: Calendar as any,
frontend/src/components/misc/sidebar-left.tsx:82 — as any — icon: Settings2 as any,
frontend/src/components/misc/sidebar-left.tsx:87 — as any — icon: Blocks as any,
frontend/src/components/misc/sidebar-left.tsx:92 — as any — icon: Trash2 as any,
frontend/src/components/misc/sidebar-left.tsx:97 — as any — icon: MessageCircleQuestion as any,
frontend/src/components/motion/animated-background.tsx:49 — : any — return Children.map(children, (child: any, index) => {
frontend/src/components/motion/animated-tooltip.tsx:32 — as any — const halfWidth = (event as any).event.target.offsetWidth / 2;
frontend/src/components/motion/animated-tooltip.tsx:33 — as any — x.set((event as any).event.nativeEvent.offsetX - halfWidth);
frontend/src/components/notifications/custom-notification-kinds.tsx:35 — as unknown as — .data as unknown as CriticalIssueData;
frontend/src/components/notifications/custom-notification-kinds.tsx:76 — as unknown as — .data as unknown as DeadlineData;
frontend/src/components/notifications/custom-notification-kinds.tsx:123 — as unknown as — .data as unknown as StatusChangeData;
frontend/src/components/notifications/custom-notification-kinds.tsx:166 — as unknown as — .data as unknown as BudgetAlertData;
frontend/src/components/notifications/custom-notification-kinds.tsx:217 — as unknown as — .data as unknown as WeeklyDigestData;
frontend/src/components/notifications/custom-notification-kinds.tsx:268 — as unknown as — .data as unknown as AssignmentData;
frontend/src/components/notifications/custom-notification-kinds.tsx:303 — as unknown as — .data as unknown as ApprovalRequestData;
frontend/src/components/notifications/custom-notification-kinds.tsx:338 — as unknown as — .data as unknown as BallInCourtData;
frontend/src/components/plugins/plugin-manager-ui.tsx:75 — as any — const { data, error } = await (supabase as any)
frontend/src/components/plugins/plugin-manager-ui.tsx:100 — : any — } catch (error: any) {
frontend/src/components/plugins/plugin-manager-ui.tsx:117 — : any — } catch (error: any) {
frontend/src/components/plugins/plugin-manager-ui.tsx:127 — : any — } catch (error: any) {
frontend/src/components/portfolio/portfolio-filters.tsx:65 — : any — statusFilter?: any;
frontend/src/components/portfolio/portfolio-filters.tsx:66 — : any — onStatusFilterChange?: (value: any) => void;
frontend/src/components/primitives/tool-calling.tsx:65 — : any — (part: any) => part.type && part.type.startsWith("tool-"),
frontend/src/components/primitives/tool-calling.tsx:67 — : any — .map((part: any, index: number) => renderToolPart(part, index))}
frontend/src/components/primitives/tool-calling.tsx:74 — : any — .filter((part: any) => part.type === "text")
frontend/src/components/primitives/tool-calling.tsx:75 — : any — .map((part: any) => part.text)
frontend/src/components/primitives/tool-calling.tsx:106 — : any — .map((part: any) => (part.type === "text" ? part.text : null))
frontend/src/components/project-setup-wizard/budget-setup.tsx:134 — as unknown as — setBudgetItems(initialItems as unknown as SimpleBudgetItem[]);
frontend/src/components/project-setup-wizard/budget-setup.tsx:142 — : any — const updateBudgetItem = (index: number, field: string, value: any) => {
frontend/src/components/project-setup-wizard/cost-code-setup.tsx:240 — as any — .insert(codesToInsert as any)
frontend/src/components/project-setup-wizard/cost-code-setup.tsx:298 — as any — } as any);
frontend/src/components/project-setup-wizard/cost-code-setup.tsx:357 — as any — .insert(projectCostCodes as any);
frontend/src/components/project-setup-wizard/document-upload-setup.tsx:165 — as unknown as — setUploadedDocuments((prev) => [...prev, document as unknown as UploadedDocument]);
frontend/src/components/project-setup-wizard/drawings-setup.tsx:132 — as unknown as — setUploadedDocuments((prev) => [...prev, document as unknown as UploadedDocument]);
frontend/src/components/project-setup-wizard/project-directory-setup.tsx:135 — as any — setProjectDirectory(directoryData as any || []);
frontend/src/components/project-setup-wizard/project-directory-setup.tsx:231 — as any — setProjectDirectory([...projectDirectory, data as any]);
frontend/src/components/project-setup-wizard/schedule-setup.tsx:132 — as unknown as — setUploadedDocuments((prev) => [...prev, document as unknown as UploadedDocument]);
frontend/src/components/project-setup-wizard/specifications-setup.tsx:132 — as unknown as — setUploadedDocuments((prev) => [...prev, document as unknown as UploadedDocument]);
frontend/src/components/rag/chatkit-panel.tsx:11 — : any — onRunnerEventDelta?: (events: any[]) => void;
frontend/src/components/rag/chatkit-panel.tsx:72 — : any — onThreadChange: ({ threadId }: { threadId: any }) => onThreadChange?.(threadId ?? null),
frontend/src/components/rag/chatkit-panel.tsx:74 — : any — onError: ({ error }: { error: any }) => {
frontend/src/components/rag/chatkit-panel.tsx:76 — : any — onEffect: async ({ name }: { name: any }) => {
frontend/src/components/rag/chatkit-panel.tsx:81 — as any — onRunnerEventDelta?.((arguments as any)?.[0]?.data?.events ?? []);
frontend/src/components/rag/chatkit-panel.tsx:84 — as any — const tid = (arguments as any)?.[0]?.data?.thread_id;
frontend/src/components/scheduling/task-edit-modal.tsx:166 — : any — (field: keyof FormData, value: any) => {
frontend/src/components/sheet-editor.tsx:102 — : any — const rowData: any = {
frontend/src/components/sheet-editor.tsx:121 — : any — const generateCsv = (data: any[][]) => {
frontend/src/components/sheet-editor.tsx:125 — : any — const handleRowsChange = (newRows: any[]) => {
frontend/src/components/sheet-editor.tsx:145 — : any — onCellClick={(args: any) => {
frontend/src/components/specifications/AddRevisionDialog.tsx:96 — as any — form.setValue("file", undefined as any);
frontend/src/components/specifications/SpecificationUploadDialog.tsx:101 — as any — form.setValue("file", undefined as any);
frontend/src/components/spreadsheet/spreadsheet/react.ts:57 — as unknown as — createSpreadsheet(room as unknown as Parameters<typeof createSpreadsheet>[0]).then((spreadsheet) => {
frontend/src/components/spreadsheet/utils/isNumerical.ts:1 — : any — export function isNumerical(value: any) {
frontend/src/components/spreadsheet/utils/isNumerical.ts:4 — as any — !Number.isNaN(value as any) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
frontend/src/components/tables/DataTableResponsive.tsx:93 — : any — const defaultMobileCardRenderer = (row: any) => {
frontend/src/components/tables/DataTableResponsive.tsx:98 — : any — const column = columns.find((c: any) => c.accessorKey === col);
frontend/src/components/tables/generic-editable-table.tsx:51 — : any — render?: (value: any, row: T) => React.ReactNode;
frontend/src/components/tables/unified/unified-table-page.tsx:1710 — as unknown as — onClick={() => table.onRowClick?.(null as unknown as T)}
frontend/src/features/invoicing/payments-tab.tsx:134 — as unknown as — amount: 0 as unknown as number,
frontend/src/features/knowledge/knowledge-form-dialog.tsx:91 — as any — resolver: zodResolver(knowledgeFormSchema) as any,
frontend/src/features/submittals/submittal-form-dialog.tsx:128 — as any — submittal_package_id: overrides?.submittal_package_id ?? (typeof submittal?.submittal_package === "object" ? (submittal?.submittal_package as any)?.id : null) ?? null,
frontend/src/features/tasks/tasks-table-config.tsx:200 — as unknown as — return item as unknown as Record<string, string | null>;
frontend/src/hooks/use-change-management.ts:107 — as unknown as — return (data ?? []) as unknown as CommitmentCO[];
frontend/src/hooks/use-commitments-query.ts:286 — : any — queryClient.setQueryData(commitmentKeys.detail(input.id), (current: any) => {
frontend/src/hooks/use-contracts.ts:131 — as unknown as — setContracts((data || []) as unknown as Contract[]);
frontend/src/hooks/use-contracts.ts:176 — as unknown as — return data as unknown as Contract;
frontend/src/hooks/use-cost-codes.ts:131 — as unknown as — setCostCodes((data || []) as unknown as CostCode[]);
frontend/src/hooks/use-cost-codes.ts:182 — as unknown as — return data as unknown as CostCode;
frontend/src/hooks/use-dev-autofill.tsx:44 — : any — setValue: (name: keyof T, value: any) => void,
frontend/src/hooks/use-infinite-query.ts:137 — as unknown as — }) as unknown as SupabaseSelectBuilder<T>;
frontend/src/hooks/use-infinite-query.ts:190 — : any — const initialState: any = {
frontend/src/hooks/use-is-client.ts:77 — as any — isClient: (data as any)?.user_type === 'Client' || false,
frontend/src/hooks/use-is-client.ts:80 — as any — clientCompanyId: (data as any)?.company_id,
frontend/src/hooks/use-is-client.ts:81 — as any — role: (data as any)?.permission_template_id,
frontend/src/hooks/use-permission-templates.ts:12 — : any — rules_json: any;
frontend/src/hooks/use-project-permissions.ts:110 — as any — const template = membership.permission_template as any;
frontend/src/hooks/useChatKit.ts:61 — : any — acc[key] = (...args: any[]) => {
frontend/src/hooks/useChatKit.ts:65 — as any — return (ref.current as any)[key](...args);
frontend/src/hooks/useChatKit.ts:84 — as any — (handlers as any)[key] = value;
frontend/src/hooks/useChatKit.ts:86 — as any — (options as any)[key] = value;
frontend/src/hooks/useStableOptions.test.ts:141 — : any — times(this: any, x: number) {
frontend/src/hooks/useStableOptions.test.ts:151 — : any — times(this: any, x: number) {
frontend/src/hooks/useStableOptions.ts:68 — : any — const getByPath = (root: any, p: (string | number)[]) =>
frontend/src/hooks/useStableOptions.ts:72 — : any — return (...args: any[]) => {
frontend/src/hooks/useStableOptions.ts:74 — : any — const latestFn: any = latestParent?.[key];
frontend/src/hooks/useStableOptions.ts:81 — : any — const visit = (v: any): any => {
frontend/src/hooks/useStableOptions.ts:81 — : any — const visit = (v: any): any => {
frontend/src/hooks/useStableOptions.ts:95 — as any — return out as any;
frontend/src/hooks/useStableOptions.ts:105 — as any — return out as any;
frontend/src/i18n.ts:19 — : any — const langObj: any = { en, ae, da, de, el, es, fr, hu, it, ja, pl, pt, ru, sv, tr, zh };
frontend/src/i18n.ts:35 — : any — const data: any = langObj[lang || 'en'];
frontend/src/lib/acumatica/client.ts:81 — : any — function unwrap<T>(raw: any): T {
frontend/src/lib/acumatica/sync.ts:983 — as any — const { error } = await (supabase as any)
frontend/src/lib/ai/bot-core.ts:255 — as unknown as — tools: tools as unknown as ToolSet,
frontend/src/lib/ai/bot-core.ts:312 — as unknown as — tools: tools as unknown as ToolSet,
frontend/src/lib/ai/bot-core.ts:359 — as any — await (supabase.from("chat_history") as any).insert({
frontend/src/lib/ai/models.mock.ts:73 — as unknown as — } as unknown as LanguageModel;
frontend/src/lib/ai/models.mock.ts:121 — as unknown as — } as unknown as LanguageModel;
frontend/src/lib/ai/models.mock.ts:167 — as unknown as — } as unknown as LanguageModel;
frontend/src/lib/ai/orchestrator.ts:188 — as any — return createProjectTools(userId, options as any);
frontend/src/lib/ai/orchestrator.ts:265 — as any — return createProjectTools(userId, options as any);
frontend/src/lib/ai/orchestrator.ts:336 — as any — return createProjectTools(userId, options as any);
frontend/src/lib/ai/orchestrator.ts:437 — as any — return createProjectTools(userId, options as any);
frontend/src/lib/ai/orchestrator.ts:530 — as any — ...createProjectTools(userId, options as any),
frontend/src/lib/ai/orchestrator.ts:531 — as any — ...createWebSearchTools(options as any),
frontend/src/lib/ai/orchestrator.ts:532 — as unknown as — } as unknown as ToolSet;
frontend/src/lib/ai/orchestrator.ts:763 — as any — const baseTools = createProjectTools(userId, options as any);
frontend/src/lib/ai/orchestrator.ts:766 — as any — const webSearchTools = createWebSearchTools(options as any);
frontend/src/lib/ai/orchestrator.ts:770 — as any — const actionTools = createActionTools(userId, options as any);
frontend/src/lib/ai/orchestrator.ts:1001 — as unknown as — } as unknown as ToolSet;
frontend/src/lib/ai/services/ai-memory-service.ts:330 — as unknown as — return { memories: data as unknown as AiMemory[], total: count ?? 0 };
frontend/src/lib/ai/tools/action-tools.ts:89 — as any — const { data } = await (supabase as any)
frontend/src/lib/ai/tools/action-tools.ts:111 — as any — await (supabase as any).from("ai_tool_write_audits").insert({
frontend/src/lib/ai/tools/action-tools.ts:1565 — as any — const { data: existing } = await (supabase as any)
frontend/src/lib/ai/tools/action-tools.ts:1656 — as any — const { data, error } = await (supabase as any)
frontend/src/lib/ai/tools/acumatica.ts:266 — as unknown as — ? allBills.filter((b) => (b.Status as unknown as { value?: string } | undefined)?.value === status)
frontend/src/lib/ai/tools/acumatica.ts:327 — as unknown as — ? allInvoices.filter((i) => (i.Status as unknown as { value?: string } | undefined)?.value === status)
frontend/src/lib/ai/tools/acumatica.ts:549 — as unknown as — ? allPos.filter((po) => (po.Status as unknown as { value?: string } | undefined)?.value === status)
frontend/src/lib/ai/tools/financial.ts:191 — as unknown as — const subs = (subRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:192 — as unknown as — const pos = (poRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:193 — as unknown as — const sovs = (sovRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:194 — as unknown as — const vendors = (vendorRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:230 — as unknown as — sovLineItems = (data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:380 — as any — (supabase as any)
frontend/src/lib/ai/tools/financial.ts:389 — as unknown as — const primeCOs = ((primeCoRes.data ?? []) as unknown as Record<string, unknown>[]).map((co) => ({
frontend/src/lib/ai/tools/financial.ts:394 — as unknown as — const commitCOs = ((commitCoRes.data ?? []) as unknown as Record<string, unknown>[]).map((co) => ({
frontend/src/lib/ai/tools/financial.ts:398 — as unknown as — const changeOrders = [...primeCOs, ...commitCOs] as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:399 — as unknown as — const changeEvents = (ceRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:400 — as unknown as — const contracts = (contractRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:401 — as unknown as — const coLines = (coLinesRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:582 — as unknown as — const directCosts = (dcRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:583 — as unknown as — const vendors = (vendorRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:584 — as unknown as — const allLineItems = (lineItemsRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:713 — as any — const supabaseAny = supabase as any;
frontend/src/lib/ai/tools/financial.ts:715 — : any — let blQuery: any = supabaseAny
frontend/src/lib/ai/tools/financial.ts:751 — as unknown as — const budgetLines = (blRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:752 — as unknown as — const costCodes = (ccRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:753 — as unknown as — const costTypes = (ctRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:754 — as unknown as — const forecasts = (forecastRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:755 — as unknown as — const dcLineItems = (directCostLinesRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:965 — as unknown as — const directCosts = (dcRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:966 — as unknown as — const invoices = (invoiceRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:967 — as unknown as — const snapshots = (snapshotRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:968 — as unknown as — const changeOrders = ((coRes.data ?? []) as unknown as AnyRow[]).map(co => ({
frontend/src/lib/ai/tools/financial.ts:971 — as unknown as — })) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:1154 — as any — (supabase as any)
frontend/src/lib/ai/tools/financial.ts:1155 — as any — .from("v_budget_lines" as any)
frontend/src/lib/ai/tools/financial.ts:1186 — as unknown as — const primeContracts = (primeContractRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:1187 — as unknown as — const budgetLines = (budgetRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:1188 — as unknown as — const directCosts = (directCostRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:1189 — as unknown as — const sovs = (sovRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:1190 — as unknown as — const forecasts = (forecastRes.data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/financial.ts:1191 — as unknown as — const changeOrders = ((coRes.data ?? []) as unknown as AnyRow[]).map(co => ({
frontend/src/lib/ai/tools/financial.ts:1194 — as unknown as — })) as unknown as AnyRow[];
frontend/src/lib/ai/tools/operational.ts:402 — as unknown as — const memberRows = (members ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/operational.ts:496 — as unknown as — const subs = (subRows ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/operational.ts:1272 — as any — .from("v_budget_lines" as any)
frontend/src/lib/ai/tools/operational.ts:1435 — as any — (supabase as any).rpc("search_document_chunks", {
frontend/src/lib/ai/tools/operational.ts:1818 — as unknown as — const articleList = ((articles ?? []) as unknown as AnyRow[]).map(
frontend/src/lib/ai/tools/operational.ts:2557 — as unknown as — projects: ((data ?? []) as unknown as AnyRow[]).map((p) => ({
frontend/src/lib/ai/tools/operational.ts:2583 — as unknown as — const matches = (data ?? []) as unknown as AnyRow[];
frontend/src/lib/ai/tools/operational.ts:3182 — as any — const { data, error } = await (supabase as any).rpc(
frontend/src/lib/ai/tools/project-tools.ts:401 — as any — .from("risks" as any)
frontend/src/lib/ai/tools/project-tools.ts:407 — as unknown as — .limit(2000) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: unknown }>,
frontend/src/lib/ai/tools/project-tools.ts:678 — as any — .from("v_budget_lines" as any)
frontend/src/lib/ai/tools/project-tools.ts:682 — as unknown as — .eq("project_id", resolvedId) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: unknown }>,
frontend/src/lib/ai/tools/project-tools.ts:1035 — as any — .from("v_budget_lines" as any)
frontend/src/lib/ai/tools/project-tools.ts:1039 — as unknown as — .eq("project_id", resolvedId) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: unknown }>,
frontend/src/lib/bot/index.ts:87 — as any — const { data: admin } = await (supabase as any)
frontend/src/lib/bot/index.ts:94 — as any — return (admin as any)?.id ?? "system";
frontend/src/lib/db/decisions.ts:22 — as any — .from("decisions" as any)
frontend/src/lib/db/decisions.ts:51 — as any — .from("decisions" as any)
frontend/src/lib/db/decisions.ts:70 — as any — .from("decisions" as any)
frontend/src/lib/db/decisions.ts:89 — as any — .from("decisions" as any)
frontend/src/lib/db/queries.ts:41 — as unknown as — const globalForDb = globalThis as unknown as { pgClient: ReturnType<typeof postgres> };
frontend/src/lib/documents/record-documents.ts:358 — as any — peopleMap.set(person.id, person as any);
frontend/src/lib/documents/record-documents.ts:377 — as any — peopleMap.set(person.id, person as any);
frontend/src/lib/documents/record-documents.ts:1112 — as unknown as — const contract = contractData as unknown as PrimeContractRow;
frontend/src/lib/documents/record-documents.ts:1285 — as unknown as — const base = baseData as unknown as CommitmentBaseRow;
frontend/src/lib/documents/record-documents.ts:1462 — as unknown as — const changeOrder = changeOrderData as unknown as ChangeOrderRow;
frontend/src/lib/documents/record-documents.ts:1473 — as any — .from("change_order_lines" as any)
frontend/src/lib/documents/record-documents.ts:1501 — as unknown as — const lineItems = (lineItemsResult.data ?? []) as unknown as ChangeOrderLineRow[];
frontend/src/lib/documents/record-documents.ts:1510 — as any — .from("clients" as any)
frontend/src/lib/documents/record-documents.ts:1512 — as any — .in("id", clientIds)) as any;
frontend/src/lib/documents/record-documents.ts:1518 — as any — clientsById = new Map(((clientRows ?? []) as any[]).map((client) => [client.id, client as ClientRow]));
frontend/src/lib/documents/record-documents.ts:1636 — as unknown as — const contract = contractData as unknown as PrimeContractRow;
frontend/src/lib/integrations/email-notifications.tsx:419 — as any — {(comment as any).reactBody ?? (comment as any).body}
frontend/src/lib/integrations/email-notifications.tsx:419 — as any — {(comment as any).reactBody ?? (comment as any).body}
frontend/src/lib/integrations/email-notifications.tsx:460 — as any — {(comment as any).reactBody ?? (comment as any).body}
frontend/src/lib/integrations/email-notifications.tsx:460 — as any — {(comment as any).reactBody ?? (comment as any).body}
frontend/src/lib/integrations/email-notifications.tsx:563 — as any — {(emailData.mention as any).reactContent ?? (emailData.mention as any).body}
frontend/src/lib/integrations/email-notifications.tsx:563 — as any — {(emailData.mention as any).reactContent ?? (emailData.mention as any).body}
frontend/src/lib/integrations/email-notifications.tsx:656 — as unknown as — const d = data as unknown as CriticalIssueData;
frontend/src/lib/integrations/email-notifications.tsx:686 — as unknown as — const d = data as unknown as DeadlineData;
frontend/src/lib/integrations/email-notifications.tsx:715 — as unknown as — const d = data as unknown as StatusChangeData;
frontend/src/lib/integrations/email-notifications.tsx:738 — as unknown as — const d = data as unknown as BudgetAlertData;
frontend/src/lib/integrations/email-notifications.tsx:760 — as unknown as — const d = data as unknown as WeeklyDigestData;
frontend/src/lib/integrations/email-notifications.tsx:797 — as unknown as — const d = data as unknown as AssignmentData;
frontend/src/lib/integrations/email-notifications.tsx:812 — as unknown as — const d = data as unknown as ApprovalRequestData;
frontend/src/lib/integrations/email-notifications.tsx:827 — as unknown as — const d = data as unknown as BallInCourtData;
frontend/src/lib/permissions/middleware.ts:18 — : any — permissions?: any;
frontend/src/lib/permissions/middleware.ts:108 — as any — const params = await (firstArg as any).params;
frontend/src/lib/permissions.ts:345 — : any — supabase: any,
frontend/src/lib/permissions.ts:393 — as unknown as — return (data ?? []) as unknown as Array<{
frontend/src/lib/pg-meta/index.ts:1 — @ts-expect-error — // @ts-expect-error - common-tags doesn't have type definitions
frontend/src/lib/plugins/plugin-context.tsx:77 — : any — data: any,
frontend/src/lib/plugins/plugin-context.tsx:103 — : any — data?: any,
frontend/src/lib/plugins/plugin-context.tsx:108 — as any — "api:request" as any,
frontend/src/lib/plugins/plugin-context.tsx:114 — as any — await pluginManager.executeHooks("api:request" as any, context);
frontend/src/lib/plugins/plugin-context.tsx:121 — as any — await pluginManager.executeHooks("api:response" as any, {
frontend/src/lib/plugins/plugin-context.tsx:129 — as any — await pluginManager.executeHooks("api:response" as any, {
frontend/src/lib/plugins/plugin-hooks.tsx:222 — : any — project: any;
frontend/src/lib/plugins/plugin-hooks.tsx:237 — : any — Component: React.ComponentType<P & { pluginHookResults?: any[] }>,
frontend/src/lib/plugins/plugin-hooks.tsx:256 — : any — const handleNotification = ({ message, type }: any) => {
frontend/src/lib/plugins/plugin-hooks.tsx:279 — : any — const handleModal = ({ content }: any) => {
frontend/src/lib/plugins/plugin-hooks.tsx:307 — : any — return (props: P & { pluginContext?: any }) => {
frontend/src/lib/plugins/plugin-loader.ts:135 — as any — sandbox[global] = (globalThis as any)[global];
frontend/src/lib/plugins/plugin-loader.ts:143 — as any — sandbox[global] = (globalThis as any)[global];
frontend/src/lib/plugins/plugin-loader.ts:156 — as any — sandbox.React = (window as any).React;
frontend/src/lib/plugins/plugin-loader.ts:157 — as any — sandbox.ReactDOM = (window as any).ReactDOM;
frontend/src/lib/plugins/plugin-loader.ts:222 — : any — pluginModule: any,
frontend/src/lib/plugins/plugin-loader.ts:253 — as any — if (typeof (plugin.lifecycle as any)[method] !== "function") {
frontend/src/lib/plugins/plugin-manager.ts:70 — as any — const { data: pluginRecords, error } = await (this.supabase as any)
frontend/src/lib/plugins/plugin-manager.ts:79 — as any — for (const record of (pluginRecords as any[]) || []) {
frontend/src/lib/plugins/plugin-manager.ts:131 — : any — private evaluatePluginCode(code: string, manifest: PluginManifest): any {
frontend/src/lib/plugins/plugin-manager.ts:154 — as any — const { data } = await (this.supabase as any)
frontend/src/lib/plugins/plugin-manager.ts:160 — as any — return (data as any)?.value;
frontend/src/lib/plugins/plugin-manager.ts:162 — : any — set: async (key: string, value: any) => {
frontend/src/lib/plugins/plugin-manager.ts:163 — as any — await (this.supabase as any).from("plugin_storage").upsert({
frontend/src/lib/plugins/plugin-manager.ts:166 — as any — value: value as any,
frontend/src/lib/plugins/plugin-manager.ts:167 — as any — } as any);
frontend/src/lib/plugins/plugin-manager.ts:170 — as any — await (this.supabase as any)
frontend/src/lib/plugins/plugin-manager.ts:177 — as any — await (this.supabase as any)
frontend/src/lib/plugins/plugin-manager.ts:215 — : any — query: async (table: string, query: any) => {
frontend/src/lib/plugins/plugin-manager.ts:216 — as any — const { data } = await (this.supabase as any)
frontend/src/lib/plugins/plugin-manager.ts:223 — : any — insert: async (table: string, data: any) => {
frontend/src/lib/plugins/plugin-manager.ts:224 — as any — const { data: result } = await (this.supabase as any)
frontend/src/lib/plugins/plugin-manager.ts:231 — : any — update: async (table: string, id: string, data: any) => {
frontend/src/lib/plugins/plugin-manager.ts:232 — as any — const { data: result } = await (this.supabase as any)
frontend/src/lib/plugins/plugin-manager.ts:241 — as any — await (this.supabase as any).from(table).delete().eq("id", id);
frontend/src/lib/plugins/plugin-manager.ts:246 — : any — emit: (event: string, data: any) => {
frontend/src/lib/plugins/plugin-manager.ts:249 — : any — on: (event: string, handler: (data: any) => void) => {
frontend/src/lib/plugins/plugin-manager.ts:250 — : any — const wrappedHandler = (data: any) => handler(data);
frontend/src/lib/plugins/plugin-manager.ts:254 — : any — off: (event: string, handler: (data: any) => void) => {
frontend/src/lib/plugins/plugin-manager.ts:262 — : any — post: (url: string, data: any, options?: RequestInit) =>
frontend/src/lib/plugins/plugin-manager.ts:272 — : any — put: (url: string, data: any, options?: RequestInit) =>
frontend/src/lib/plugins/plugin-manager.ts:358 — as any — const { data: record, error } = await (this.supabase as any)
frontend/src/lib/plugins/plugin-manager.ts:386 — as any — const { error } = await (this.supabase as any)
frontend/src/lib/plugins/plugin-manager.ts:394 — as any — const { data: record } = await (this.supabase as any)
frontend/src/lib/plugins/plugin-manager.ts:401 — as any — await this.loadPlugin(record as any as PluginRecord);
frontend/src/lib/plugins/plugin-manager.ts:427 — as any — const { error } = await (this.supabase as any)
frontend/src/lib/plugins/plugin-manager.ts:453 — as any — const { error } = await (this.supabase as any)
frontend/src/lib/plugins/plugin-manager.ts:506 — : any — } catch (error: any) {
frontend/src/lib/plugins/plugin-manager.ts:507 — : any — errors.push(...error.errors.map((e: any) => e.message));
frontend/src/lib/plugins/plugin-manager.ts:535 — as any — await (this.supabase as any)
frontend/src/lib/services/estimate-service.ts:118 — : any — return (data ?? []).map((row: any) => ({
frontend/src/lib/services/estimate-service.ts:163 — as any — type: row.estimate_type as any,
frontend/src/lib/services/estimate-service.ts:179 — as any — return Array.from(statsMap.values()).filter((s) => s.total > 0 || EstimateTypes.includes(s.type as any));
frontend/src/lib/services/estimate-service.ts:263 — as any — estimate_type: (data as any).estimate_type ?? null,
frontend/src/lib/services/estimate-service.ts:319 — as any — if ((data as any).estimate_type !== undefined)
frontend/src/lib/services/estimate-service.ts:320 — as any — updatePayload.estimate_type = (data as any).estimate_type;
frontend/src/lib/types.ts:109 — : any — tool_result?: any;
frontend/src/lib/types.ts:111 — : any — context_value?: any;
frontend/src/lib/types.ts:116 — : any — [key: string]: any; // Allow additional properties
frontend/src/server/db/crud.ts:67 — : any — function getQueryBuilder(tableName: string): any {
frontend/src/server/db/crud.ts:70 — as any — return (supabase as any).from(tableName);
frontend/src/server/db/introspection.ts:86 — as any — const { data, error } = await (supabase as any).from(table).select("*").limit(1);
frontend/src/services/DrawingService.ts:358 — as unknown as — return { data: undefined as unknown as void, error: null };
frontend/src/services/DrawingService.ts:390 — as unknown as — return { data: undefined as unknown as void, error: null };
frontend/src/services/DrawingService.ts:429 — as unknown as — return { data: undefined as unknown as void, error: null };
frontend/src/services/DrawingSetService.ts:74 — as unknown as — ...(rest as unknown as DrawingSet),
frontend/src/services/SpecificationAreaService.ts:50 — : any — (area: any) => ({
frontend/src/services/SpecificationAreaService.ts:387 — : any — .map((link: any) => link.section)
frontend/src/services/SpecificationService.ts:150 — : any — (spec: any) => ({
frontend/src/services/SpecificationService.ts:224 — : any — .map((a: any) => a.area)
frontend/src/services/directoryAdminService.ts:274 — as unknown as — payload as unknown as Record<string, unknown>,
frontend/src/services/directoryAdminService.ts:314 — as any — let query = (this.supabase as any)
frontend/src/services/directoryAdminService.ts:328 — : any — return (data || []).map((entry: any) => ({
frontend/src/services/directoryAdminService.ts:662 — : any — private getColumnValue(person: any, columnId: string): string | null {
frontend/src/services/directoryPreferencesService.ts:52 — as any — const typed = directoryPrefs as any;
frontend/src/services/directoryPreferencesService.ts:105 — as any — preferences: emptyEnvelope as any,
frontend/src/services/directoryPreferencesService.ts:127 — as any — .update({ preferences: preferences as any })
frontend/src/services/directoryService.ts:260 — : any — const transformedData: PersonWithDetails[] = (data || []).map((person: any) => ({
frontend/src/services/directoryService.ts:470 — : any — const personUpdate: any = {};
frontend/src/services/directoryService.ts:497 — : any — const membershipUpdate: any = {};
frontend/src/services/directoryService.ts:706 — as any — const { data: overrides, error } = await (this.supabase as any)
frontend/src/services/directoryService.ts:756 — as any — await (this.supabase as any)
frontend/src/services/directoryService.ts:764 — as any — const { error } = await (this.supabase as any)
frontend/src/services/directoryService.ts:800 — as any — const { error } = await (this.supabase as any)
frontend/src/services/drawings/DrawingRelatedService.ts:87 — as unknown as — return { data: undefined as unknown as void, error: null };
frontend/src/types/chatkit.d.ts:5 — : any — [key: string]: any; // Allow any options
frontend/src/types/chatkit.d.ts:9 — : any — setOptions(options: any): void;
frontend/src/types/chatkit.d.ts:15 — : any — sendCustomAction(action: any): void;
frontend/src/types/plugin.types.ts:68 — : any — data: any;
frontend/src/types/plugin.types.ts:85 — : any — set: (key: string, value: any) => Promise<void>;
frontend/src/types/plugin.types.ts:104 — : any — query: (table: string, query: any) => Promise<any[]>;
frontend/src/types/plugin.types.ts:105 — : any — insert: (table: string, data: any) => Promise<any>;
frontend/src/types/plugin.types.ts:106 — : any — update: (table: string, id: string, data: any) => Promise<any>;
frontend/src/types/plugin.types.ts:112 — : any — emit: (event: string, data: any) => void;
frontend/src/types/plugin.types.ts:113 — : any — on: (event: string, handler: (data: any) => void) => () => void;
frontend/src/types/plugin.types.ts:114 — : any — off: (event: string, handler: (data: any) => void) => void;
frontend/src/types/plugin.types.ts:120 — : any — post: (url: string, data: any, options?: RequestInit) => Promise<Response>;
frontend/src/types/plugin.types.ts:121 — : any — put: (url: string, data: any, options?: RequestInit) => Promise<Response>;
frontend/src/types/plugin.types.ts:152 — : any — condition?: (project: any) => boolean;
frontend/src/types/swagger-ui-dist.d.ts:2 — : any — const SwaggerUIBundle: any;
frontend/src/types/swagger-ui-dist.d.ts:7 — : any — const SwaggerUIStandalonePreset: any;
frontend/src/types/swagger-ui.d.ts:3 — : any — SwaggerUIBundle: any;
frontend/src/types/swagger-ui.d.ts:4 — : any — SwaggerUIStandalonePreset: any;
```

---

## Untyped Supabase clients

Every `createClient()` call below returns a `SupabaseClient` without the
`Database` generic. That means TypeScript cannot distinguish a real table
from a typo — this is the **root cause class for phantom-table bugs**.
Fixing this one pattern eliminates most of the `as any` scattered across
API routes.

| Kind | Count |
|------|------:|
| `createClient()` call without `<Database>` | 138 |
| `SupabaseClient` type without `<Database>` | 21 |
| `SupabaseClient<NotDatabase>` (wrong generic) | 1 |

### Detail

`file:line — kind — line content`

```
frontend/src/app/(admin)/(procore)/support-articles/[articleId]/page.tsx:18 — untyped-call — const supabase = await createClient();
frontend/src/app/(admin)/(procore)/support-articles/support-articles-client.tsx:499 — untyped-call — const supabase = createClient();
frontend/src/app/(admin)/(procore)/support-articles/support-articles-client.tsx:533 — untyped-call — const supabase = createClient();
frontend/src/app/(admin)/tools/page.tsx:174 — untyped-call — const supabase = await createClient();
frontend/src/app/(auth)/auth.ts:32 — untyped-call — const supabase = await createClient();
frontend/src/app/(auth)/auth.ts:55 — untyped-call — const supabase = await createClient();
frontend/src/app/(main)/[projectId]/layout.tsx:29 — untyped-call — const supabase = await createClient();
frontend/src/app/(main)/settings/users/page.tsx:95 — untyped-call — const supabase = createClient();
frontend/src/app/(tables)/daily-logs/[id]/page.tsx:5 — untyped-call — const supabase = await createClient();
frontend/src/app/api/admin/acumatica-outbound-logs/route.ts:68 — untyped-call — const supabase = await createClient();
frontend/src/app/api/admin/company-context/route.ts:22 — untyped-call — const supabase = await createClient();
frontend/src/app/api/admin/company-knowledge/route.ts:12 — untyped-call — const supabase = await createClient();
frontend/src/app/api/admin/feedback/github-comments/route.ts:7 — untyped-call — const supabase = await createClient();
frontend/src/app/api/admin/rag-eval/results/route.ts:12 — untyped-call — const supabase = await createClient();
frontend/src/app/api/admin/rag-eval/run/route.ts:20 — untyped-call — const supabase = await createClient();
frontend/src/app/api/commitments/[commitmentId]/email/route.ts:87 — untyped-call — const supabase = await createClient();
frontend/src/app/api/commitments/[commitmentId]/emails/route.ts:10 — untyped-call — const supabase = await createClient();
frontend/src/app/api/commitments/[commitmentId]/invoices/route.ts:170 — untyped-call — const supabase = await createClient();
frontend/src/app/api/commitments/[commitmentId]/invoices/route.ts:279 — untyped-call — const supabase = await createClient();
frontend/src/app/api/commitments/[commitmentId]/rfqs/route.ts:34 — untyped-call — const supabase = await createClient();
frontend/src/app/api/dev/make-admin/route.ts:26 — untyped-call — const supabase = await createClient();
frontend/src/app/api/dev/make-admin/route.ts:124 — untyped-call — const supabase = await createClient();
frontend/src/app/api/dev-panel/annotations/route.ts:25 — untyped-call — const supabase = await createClient();
frontend/src/app/api/dev-panel/comments/[feature]/route.ts:16 — untyped-call — const supabase = await createClient();
frontend/src/app/api/dev-panel/comments/[feature]/route.ts:58 — untyped-call — const supabase = await createClient();
frontend/src/app/api/dev-panel/feedback/[feature]/route.ts:16 — untyped-call — const supabase = await createClient();
frontend/src/app/api/dev-panel/spec/[feature]/route.ts:19 — untyped-call — const supabase = await createClient();
frontend/src/app/api/directory/project-companies/route.ts:12 — untyped-call — const supabase = await createClient();
frontend/src/app/api/files/read/route.ts:23 — untyped-call — const supabase = await createClient();
frontend/src/app/api/monitoring/dashboard/route.ts:354 — untyped-call — const supabase = await createClient();
frontend/src/app/api/monitoring/todo-integration/route.ts:39 — untyped-call — const supabase = await createClient();
frontend/src/app/api/monitoring/todo-integration/route.ts:66 — untyped-call — const supabase = await createClient();
frontend/src/app/api/og/proxy/route.ts:9 — untyped-call — const supabase = await createClient();
frontend/src/app/api/permissions/users/route.ts:19 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/budget/lines/[lineId]/history/route.ts:21 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/lineage/route.ts:23 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/change-events/commitment-options/route.ts:33 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/change-events/rfqs/[rfqId]/responses/route.ts:10 — untyped-SupabaseClient — type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
frontend/src/app/api/projects/[projectId]/change-events/rfqs/[rfqId]/responses/route.ts:23 — untyped-SupabaseClient — supabase: SupabaseClient,
frontend/src/app/api/projects/[projectId]/commitment-options/route.ts:22 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/commitment-pcos/promote-bulk/route.ts:29 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/contracts/[contractId]/advanced-settings/route.ts:71 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/documents/[documentId]/route.ts:38 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/documents/[documentId]/route.ts:77 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/documents/[documentId]/route.ts:123 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/documents/route.ts:39 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/documents/route.ts:100 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/emails/[emailId]/route.ts:41 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/emails/[emailId]/route.ts:76 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/emails/[emailId]/route.ts:125 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/emails/route.ts:41 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/emails/route.ts:97 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items/[lineItemId]/route.ts:12 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items/route.ts:32 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items/route.ts:85 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items/route.ts:170 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/payments/[paymentId]/route.ts:9 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/payments/route.ts:12 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/payments/route.ts:105 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/approve/route.ts:12 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/approve-as-noted/route.ts:12 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/erp-resend/route.ts:14 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/pending-owner-approval/route.ts:14 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/related-items/route.ts:13 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/related-items/route.ts:40 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/related-items/route.ts:86 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/revise/route.ts:12 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/void/route.ts:12 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/photo-albums/[albumId]/route.ts:24 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/photo-albums/[albumId]/route.ts:56 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/photo-albums/route.ts:24 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/photo-albums/route.ts:42 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/photos/[photoId]/restore/route.ts:22 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/photos/[photoId]/route.ts:41 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/photos/[photoId]/route.ts:72 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/photos/[photoId]/route.ts:119 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/photos/route.ts:41 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/photos/route.ts:95 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/photos/upload/route.ts:30 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/prime-contract-pcos/promote-bulk/route.ts:30 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/distribute/route.ts:28 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/duplicate/route.ts:22 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/restore/route.ts:22 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/revisions/route.ts:21 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/revisions/route.ts:56 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts:49 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts:137 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts:184 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]/respond/route.ts:35 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]/route.ts:22 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/route.ts:28 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/route.ts:50 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/export/route.ts:23 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/packages/route.ts:28 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/packages/route.ts:51 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/route.ts:49 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/route.ts:132 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/submittals/specs/route.ts:22 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/transmittals/[transmittalId]/route.ts:43 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/transmittals/[transmittalId]/route.ts:76 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/transmittals/[transmittalId]/route.ts:118 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/transmittals/route.ts:43 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/transmittals/route.ts:91 — untyped-call — const supabase = await createClient();
frontend/src/app/api/projects/[projectId]/vendors/route.ts:31 — untyped-call — const supabase = await createClient();
frontend/src/app/api/supabase-proxy/[...path]/route.ts:32 — untyped-call — const supabase = await createClient();
frontend/src/app/api/sync/acumatica/export/route.ts:56 — untyped-call — const supabase = await createClient();
frontend/src/app/api/sync/acumatica/mirror/route.ts:33 — untyped-call — const supabase = await createClient();
frontend/src/app/api/testing/parity/route.ts:61 — untyped-call — const supabase = await createClient();
frontend/src/app/api/testing/runs/[runId]/results/[resultId]/route.ts:14 — untyped-call — const supabase = await createClient();
frontend/src/app/api/testing/runs/[runId]/results/[resultId]/screenshots/route.ts:15 — untyped-call — const supabase = await createClient();
frontend/src/app/api/testing/runs/[runId]/results/route.ts:32 — untyped-call — const supabase = await createClient();
frontend/src/app/api/testing/runs/route.ts:14 — untyped-call — const supabase = await createClient();
frontend/src/app/api/testing/runs/route.ts:89 — untyped-call — const supabase = await createClient();
frontend/src/app/api/testing/suites/[slug]/cases/route.ts:19 — untyped-call — const supabase = await createClient();
frontend/src/app/api/testing/suites/route.ts:13 — untyped-call — const supabase = await createClient();
frontend/src/app/auth/logout/route.ts:5 — untyped-call — const supabase = await createClient();
frontend/src/app/auth/logout/route.ts:25 — untyped-call — const supabase = await createClient();
frontend/src/components/ai-assistant/welcome-screen.tsx:78 — untyped-call — const supabase = useMemo(() => createClient(), []);
frontend/src/components/app-sidebar.tsx:312 — untyped-call — const supabase = createClient()
frontend/src/components/guards/permission-guard.tsx:26 — untyped-call — const supabase = await createClient();
frontend/src/components/header/use-header-nav.ts:592 — untyped-call — const supabase = createClient();
frontend/src/components/header/use-header-nav.ts:985 — untyped-call — const supabase = createClient();
frontend/src/components/tables/employees-data-table.tsx:252 — untyped-call — const supabase = createClient();
frontend/src/components/tables/employees-data-table.tsx:282 — untyped-call — const supabase = createClient();
frontend/src/components/tutorial/fetch-data-steps.tsx:24 — untyped-call — const supabase = await createClient()
frontend/src/components/tutorial/fetch-data-steps.tsx:38 — untyped-call — const supabase = createClient()
frontend/src/hooks/use-auth-users.ts:21 — untyped-call — const supabase = createClient();
frontend/src/hooks/use-company-contacts.ts:92 — untyped-call — const supabase = createClient();
frontend/src/hooks/use-current-user-profile.ts:118 — untyped-call — const supabase = createClient();
frontend/src/hooks/use-infinite-query.ts:11 — untyped-call — const supabase = createClient();
frontend/src/hooks/use-infinite-query.ts:21 — untyped-SupabaseClient-wrong-generic — SupabaseClientType extends SupabaseClient<infer U>
frontend/src/hooks/use-is-client.ts:36 — untyped-call — const supabase = createClient();
frontend/src/hooks/use-permission-templates.ts:18 — untyped-call — const supabase = createClient();
frontend/src/hooks/use-supabase-upload.ts:6 — untyped-call — const supabase = createClient()
frontend/src/hooks/use-vertical-markup.ts:25 — untyped-call — const supabase = createClient();
frontend/src/lib/acumatica/mirror-sync.ts:525 — untyped-SupabaseClient — supabase: SupabaseClient,
frontend/src/lib/acumatica/mirror-sync.ts:540 — untyped-SupabaseClient — supabase: SupabaseClient,
frontend/src/lib/acumatica/mirror-sync.ts:581 — untyped-SupabaseClient — supabase: SupabaseClient,
frontend/src/lib/acumatica/mirror-sync.ts:593 — untyped-SupabaseClient — supabase: SupabaseClient,
frontend/src/lib/acumatica/mirror-sync.ts:624 — untyped-SupabaseClient — supabase?: SupabaseClient,
frontend/src/lib/acumatica/mirror-sync.ts:808 — untyped-SupabaseClient — supabase?: SupabaseClient,
frontend/src/lib/acumatica/mirror-sync.ts:843 — untyped-SupabaseClient — supabase?: SupabaseClient,
frontend/src/lib/acumatica/mirror-sync.ts:869 — untyped-SupabaseClient — async function enrichInvoiceCustomerNames(db: SupabaseClient): Promise<void> {
frontend/src/lib/ai/services/agent-learning-service.ts:134 — untyped-call — return createClient(supabaseUrl, serviceKey, {
frontend/src/lib/change-orders/reviewer-access.ts:9 — untyped-SupabaseClient — serviceClient: SupabaseClient;
frontend/src/lib/change-orders/reviewer-access.ts:22 — untyped-call — const supabase = await createClient();
frontend/src/lib/projectIntelligence.ts:10 — untyped-call — const supabase = createClient(
frontend/src/lib/services/direct-cost-service.ts:26 — untyped-SupabaseClient — constructor(private supabase: SupabaseClient) {}
frontend/src/lib/services/estimate-service.ts:32 — untyped-SupabaseClient — constructor(private supabase: SupabaseClient) {}
frontend/src/lib/services/scheduling-service.ts:29 — untyped-SupabaseClient — constructor(private supabase: SupabaseClient) {}
frontend/src/lib/supabase/auth-guard.ts:113 — untyped-call — const authSupabase = await createClient();
frontend/src/services/drawings/DrawingFileService.ts:2 — untyped-SupabaseClient — SupabaseClient,
frontend/src/services/drawings/DrawingFileService.ts:13 — untyped-SupabaseClient — constructor(private supabase: SupabaseClient) {}
frontend/src/services/drawings/DrawingRelatedService.ts:2 — untyped-SupabaseClient — SupabaseClient,
frontend/src/services/drawings/DrawingRelatedService.ts:14 — untyped-SupabaseClient — constructor(private supabase: SupabaseClient) {}
frontend/src/services/drawings/DrawingRevisionService.ts:2 — untyped-SupabaseClient — SupabaseClient,
frontend/src/services/drawings/DrawingRevisionService.ts:13 — untyped-SupabaseClient — constructor(private supabase: SupabaseClient) {}
frontend/src/services/drawings/index.ts:18 — untyped-SupabaseClient — SupabaseClient,
frontend/src/utils/validation/directoryValidation.ts:198 — untyped-call — const supabase = createClient();
frontend/src/utils/validation/directoryValidation.ts:224 — untyped-call — const supabase = createClient();
```

---

## Raw internal fetch (Rule 13 violations)

Every line below is a place where a page, component, hook, or service calls
`fetch("/api/...")` directly instead of using `apiFetch` from
`@/lib/api-client`. Result: when the API returns a structured error body,
the UI shows a generic "Failed to fetch" / "Request failed" message instead
of the real server error.

### By bucket

| Bucket | Count |
|--------|------:|
| component | 126 |
| page `(main)` | 76 |
| page `(admin)` | 59 |
| hook | 52 |
| page `(tables)` | 11 |
| page `(chat)` | 5 |
| features | 4 |
| lib | 2 |
| contexts | 1 |

### Detail

`file:line — url — bucket — line content`

```
frontend/src/app/(admin)/acumatica-sync-logs/page.tsx:95 — /api/admin/acumatica-outbound-logs?days=365&rowLimit=10000 — page (admin) — const response = await fetch("/api/admin/acumatica-outbound-logs?days=365&rowLimit=10000");
frontend/src/app/(admin)/admin/company-info/page.tsx:665 — /api/documents/upload — page (admin) — const resp = await fetch("/api/documents/upload", {
frontend/src/app/(admin)/admin-check/page.tsx:36 — /api/auth/admin-check — page (admin) — const response = await fetch("/api/auth/admin-check");
frontend/src/app/(admin)/annotation-inbox/page.tsx:226 — /api/agentation/inbox — page (admin) — const res = await fetch("/api/agentation/inbox", {
frontend/src/app/(admin)/annotation-inbox/page.tsx:257 — /api/agentation/inbox?limit=500 — page (admin) — const primary = await fetch("/api/agentation/inbox?limit=500");
frontend/src/app/(admin)/annotation-inbox/page.tsx:267 — /api/admin/feedback?limit=500 — page (admin) — const fallback = await fetch("/api/admin/feedback?limit=500");
frontend/src/app/(admin)/annotation-inbox/page.tsx:293 — /api/agentation/inbox — page (admin) — const res = await fetch("/api/agentation/inbox", {
frontend/src/app/(admin)/annotation-inbox/page.tsx:442 — /api/dev/annotate — page (admin) — const res = await fetch("/api/dev/annotate", {
frontend/src/app/(admin)/design-violations/page.tsx:71 — /api/dev/violations?status=${status} — page (admin) — const res = await fetch(`/api/dev/violations?status=${status}`);
frontend/src/app/(admin)/design-violations/page.tsx:84 — /api/dev/violations — page (admin) — await fetch("/api/dev/violations", {
frontend/src/app/(admin)/dev/table-generator/page.tsx:414 — /api/${entityKey} — page (admin) — const resp = await fetch("/api/${entityKey}", { cache: "no-store" });
frontend/src/app/(admin)/dev/table-generator/page.tsx:584 — /api/dev/schema — page (admin) — const response = await fetch("/api/dev/schema");
frontend/src/app/(admin)/dev/table-generator/page.tsx:601 — /api/dev/schema — page (admin) — const response = await fetch("/api/dev/schema", {
frontend/src/app/(admin)/feedback-inbox/page.tsx:643 — /api/users — page (admin) — const res = await fetch("/api/users");
frontend/src/app/(admin)/feedback-inbox/page.tsx:671 — /api/admin/feedback/comments — page (admin) — const res = await fetch("/api/admin/feedback/comments", {
frontend/src/app/(admin)/feedback-inbox/page.tsx:1162 — /api/admin/feedback/tools?action=list — page (admin) — fetch("/api/admin/feedback/tools?action=list"),
frontend/src/app/(admin)/feedback-inbox/page.tsx:1163 — /api/admin/feedback/tools?action=match&feedbackId=${item.id} — page (admin) — fetch(`/api/admin/feedback/tools?action=match&feedbackId=${item.id}`),
frontend/src/app/(admin)/feedback-inbox/page.tsx:1207 — /api/admin/feedback/tools — page (admin) — const res = await fetch("/api/admin/feedback/tools", {
frontend/src/app/(admin)/feedback-inbox/page.tsx:1215 — /api/admin/feedback/tools?action=resolve&toolId=${toolId} — page (admin) — const ctxRes = await fetch(`/api/admin/feedback/tools?action=resolve&toolId=${toolId}`);
frontend/src/app/(admin)/feedback-inbox/page.tsx:1232 — /api/admin/feedback/tools — page (admin) — const res = await fetch("/api/admin/feedback/tools", {
frontend/src/app/(admin)/feedback-inbox/page.tsx:1242 — /api/admin/feedback/tools?action=resolve&toolId=${newToolId} — page (admin) — const ctxRes = await fetch(`/api/admin/feedback/tools?action=resolve&toolId=${newToolId}`);
frontend/src/app/(admin)/feedback-inbox/page.tsx:1267 — /api/admin/feedback/crawl — page (admin) — const res = await fetch("/api/admin/feedback/crawl", {
frontend/src/app/(admin)/feedback-inbox/page.tsx:1696 — /api/admin/feedback?${params.toString()} — page (admin) — const res = await fetch(`/api/admin/feedback?${params.toString()}`);
frontend/src/app/(admin)/feedback-inbox/page.tsx:1799 — /api/admin/feedback — page (admin) — const res = await fetch("/api/admin/feedback", {
frontend/src/app/(admin)/feedback-inbox/page.tsx:1824 — /api/admin/feedback — page (admin) — const res = await fetch("/api/admin/feedback", {
frontend/src/app/(admin)/feedback-inbox/page.tsx:1851 — /api/admin/feedback — page (admin) — const res = await fetch("/api/admin/feedback", {
frontend/src/app/(admin)/permissions/page.tsx:114 — /api/permissions/templates?scope=${scope} — page (admin) — const res = await fetch(`/api/permissions/templates?scope=${scope}`);
frontend/src/app/(admin)/permissions/page.tsx:121 — /api/permissions/templates — page (admin) — const res = await fetch("/api/permissions/templates");
frontend/src/app/(admin)/permissions/page.tsx:128 — /api/permissions/users — page (admin) — const res = await fetch("/api/permissions/users");
frontend/src/app/(admin)/permissions/page.tsx:195 — /api/permissions/templates — page (admin) — const res = await fetch("/api/permissions/templates", {
frontend/src/app/(admin)/permissions/page.tsx:225 — /api/permissions/templates/${id} — page (admin) — const res = await fetch(`/api/permissions/templates/${id}`, {
frontend/src/app/(admin)/permissions/page.tsx:244 — /api/permissions/templates/${id} — page (admin) — const res = await fetch(`/api/permissions/templates/${id}`, { method: "DELETE" });
frontend/src/app/(admin)/permissions/page.tsx:509 — /api/admin/set-admin-status — page (admin) — const res = await fetch("/api/admin/set-admin-status", {
frontend/src/app/(admin)/permissions/page.tsx:538 — /api/projects/${projectId}/permissions/assign — page (admin) — const res = await fetch(`/api/projects/${projectId}/permissions/assign`, {
frontend/src/app/(admin)/projects-table-demo/projects-table.tsx:108 — /api/projects/${projectId} — page (admin) — const response = await fetch(`/api/projects/${projectId}`, {
frontend/src/app/(admin)/rag-eval/page.tsx:208 — /api/admin/rag-eval/run — page (admin) — const res = await fetch("/api/admin/rag-eval/run", {
frontend/src/app/(admin)/rag-eval/page.tsx:541 — /api/admin/rag-eval/results — page (admin) — const res = await fetch("/api/admin/rag-eval/results");
frontend/src/app/(admin)/tables-directory/page.tsx:114 — /api/table-metadata — page (admin) — const response = await fetch("/api/table-metadata");
frontend/src/app/(admin)/template/form-standard/page.tsx:126 — /api/projects/${projectId}/your-endpoint — page (admin) — const response = await fetch(`/api/projects/${projectId}/your-endpoint`, {
frontend/src/app/(admin)/template/form-template/page.tsx:125 — /api/projects/${projectId}/your-endpoint — page (admin) — const response = await fetch(`/api/projects/${projectId}/your-endpoint`, {
frontend/src/app/(admin)/test-matrix/page.tsx:131 — /api/testing/runs?suite=${SUITE} — page (admin) — const res = await fetch(`/api/testing/runs?suite=${SUITE}`);
frontend/src/app/(admin)/test-matrix/page.tsx:154 — /api/testing/runs/${activeRunId}/results — page (admin) — fetch(`/api/testing/runs/${activeRunId}/results`)
frontend/src/app/(admin)/test-matrix/page.tsx:271 — /api/testing/runs — page (admin) — const res = await fetch("/api/testing/runs", {
frontend/src/app/(admin)/testing/page.tsx:190 — /api/testing/suites — page (admin) — fetch("/api/testing/suites")
frontend/src/app/(admin)/testing/page.tsx:199 — /api/testing/runs?suite=${suite.tool_name} — page (admin) — fetch(`/api/testing/runs?suite=${suite.tool_name}`)
frontend/src/app/(admin)/testing/page.tsx:249 — /api/testing/runs?suite=${suite.tool_name} — page (admin) — const res = await fetch(`/api/testing/runs?suite=${suite.tool_name}`);
frontend/src/app/(admin)/testing/page.tsx:262 — /api/testing/runs/${runId}/results — page (admin) — const res = await fetch(`/api/testing/runs/${runId}/results`);
frontend/src/app/(admin)/testing/page.tsx:276 — /api/testing/suites/${suite.tool_name}/cases?type=scenario&depth=${depth} — page (admin) — const res = await fetch(`/api/testing/suites/${suite.tool_name}/cases?type=scenario&depth=${depth}`);
frontend/src/app/(admin)/testing/page.tsx:292 — /api/testing/cases/${caseId} — page (admin) — const res = await fetch(`/api/testing/cases/${caseId}`, {
frontend/src/app/(admin)/testing/page.tsx:308 — /api/testing/cases/${caseId} — page (admin) — const res = await fetch(`/api/testing/cases/${caseId}`, { method: "DELETE" });
frontend/src/app/(admin)/testing/page.tsx:320 — /api/testing/cases — page (admin) — const res = await fetch("/api/testing/cases", {
frontend/src/app/(admin)/testing/page.tsx:368 — /api/testing/runs — page (admin) — const res = await fetch("/api/testing/runs", {
frontend/src/app/(admin)/testing/page.tsx:379 — /api/testing/runs/${run_id}/results?type=scenario — page (admin) — const r2 = await fetch(`/api/testing/runs/${run_id}/results?type=scenario`);
frontend/src/app/(admin)/testing/page.tsx:409 — /api/testing/runs/${run.id}/results?type=scenario — page (admin) — const res = await fetch(`/api/testing/runs/${run.id}/results?type=scenario`);
frontend/src/app/(admin)/testing/page.tsx:452 — /api/admin/feedback — page (admin) — await fetch("/api/admin/feedback", {
frontend/src/app/(admin)/testing/page.tsx:497 — /api/testing/runs/${activeRunId}/results/${current.id} — page (admin) — const res = await fetch(`/api/testing/runs/${activeRunId}/results/${current.id}`, {
frontend/src/app/(admin)/testing/page.tsx:527 — /api/testing/runs/${activeRunId}/results/${current.id}/screenshots — page (admin) — await fetch(`/api/testing/runs/${activeRunId}/results/${current.id}/screenshots`, {
frontend/src/app/(admin)/testing/page.tsx:532 — /api/testing/runs/${activeRunId}/results — page (admin) — const r2 = await fetch(`/api/testing/runs/${activeRunId}/results`);
frontend/src/app/(admin)/testing/page.tsx:598 — /api/testing/cases/${current.test_cases.id} — page (admin) — const res = await fetch(`/api/testing/cases/${current.test_cases.id}`, {
frontend/src/app/(chat)/chat-admin-view/page.nonprod.tsx:47 — /api/rag-chatkit/bootstrap — page (chat) — const res = await fetch("/api/rag-chatkit/bootstrap");
frontend/src/app/(chat)/chat-admin-view/page.nonprod.tsx:70 — /api/rag-chatkit/state?thread_id=${threadId} — page (chat) — const res = await fetch(`/api/rag-chatkit/state?thread_id=${threadId}`);
frontend/src/app/(chat)/chat-rag/page.nonprod.tsx:24 — /api/rag-chatkit/bootstrap — page (chat) — const res = await fetch("/api/rag-chatkit/bootstrap");
frontend/src/app/(chat)/chat-rag/page.nonprod.tsx:47 — /api/rag-chatkit/state?thread_id=${threadId} — page (chat) — const res = await fetch(`/api/rag-chatkit/state?thread_id=${threadId}`);
frontend/src/app/(chat)/simple-chat/page.nonprod.tsx:47 — /api/rag-chat — page (chat) — const response = await fetch("/api/rag-chat", {
frontend/src/app/(main)/[projectId]/admin/_components/audit-log-tab.tsx:31 — /api/projects/${projectId}/permissions/audit — page (main) — const res = await fetch(`/api/projects/${projectId}/permissions/audit`);
frontend/src/app/(main)/[projectId]/admin/_components/members-tab.tsx:57 — /api/projects/${projectId}/directory/permissions — page (main) — const res = await fetch(`/api/projects/${projectId}/directory/permissions`);
frontend/src/app/(main)/[projectId]/admin/_components/members-tab.tsx:67 — /api/permissions/templates — page (main) — const res = await fetch("/api/permissions/templates");
frontend/src/app/(main)/[projectId]/admin/_components/members-tab.tsx:76 — /api/projects/${projectId}/permissions/assign — page (main) — const res = await fetch(`/api/projects/${projectId}/permissions/assign`, {
frontend/src/app/(main)/[projectId]/admin/_components/members-tab.tsx:108 — /api/projects/${projectId}/permissions/override — page (main) — const res = await fetch(`/api/projects/${projectId}/permissions/override`, {
frontend/src/app/(main)/[projectId]/budget/line-item/new/page.tsx:195 — /api/projects/${projectId}/budget-codes — page (main) — const response = await fetch(`/api/projects/${projectId}/budget-codes`);
frontend/src/app/(main)/[projectId]/budget/line-item/new/page.tsx:254 — /api/projects/${projectId}/budget-codes — page (main) — const response = await fetch(`/api/projects/${projectId}/budget-codes`, {
frontend/src/app/(main)/[projectId]/budget/line-item/new/page.tsx:390 — /api/projects/${projectId}/budget — page (main) — const response = await fetch(`/api/projects/${projectId}/budget`, {
frontend/src/app/(main)/[projectId]/budget/setup/components/CreateBudgetCodeModal.tsx:143 — /api/projects/${projectId}/budget-codes — page (main) — const response = await fetch(`/api/projects/${projectId}/budget-codes`, {
frontend/src/app/(main)/[projectId]/budget/setup/page.tsx:228 — /api/projects/${projectId}/budget — page (main) — const response = await fetch(`/api/projects/${projectId}/budget`, {
frontend/src/app/(main)/[projectId]/change-events/page.tsx:273 — /api/projects/${projectId}/change-events/rfqs — page (main) — const response = await fetch(`/api/projects/${projectId}/change-events/rfqs`, {
frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx:517 — /api/projects/${projectId}/contracts — page (main) — fetch(`/api/projects/${projectId}/contracts`),
frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/edit/page.tsx:50 — /api/commitments/${commitmentId}/attachments — page (main) — const response = await fetch(`/api/commitments/${commitmentId}/attachments`);
frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/edit/page.tsx:263 — /api/commitments/${commitmentId} — page (main) — const res = await fetch(`/api/commitments/${commitmentId}`, {
frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/edit/page.tsx:305 — /api/commitments/${commitmentId} — page (main) — const res = await fetch(`/api/commitments/${commitmentId}`, {
frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx:800 — /api/commitments/${commitmentId} — page (main) — const res = await fetch(`/api/commitments/${commitmentId}`, {
frontend/src/app/(main)/[projectId]/commitments/new/page.tsx:126 — /api/projects/${projectId}/subcontracts — page (main) — const response = await fetch(`/api/projects/${projectId}/subcontracts`, {
frontend/src/app/(main)/[projectId]/commitments/new/page.tsx:199 — /api/projects/${projectId}/purchase-orders — page (main) — const response = await fetch(`/api/projects/${projectId}/purchase-orders`, {
frontend/src/app/(main)/[projectId]/commitments/page.tsx:90 — /api/commitments/${commitmentId}/change-orders — page (main) — fetch(`/api/commitments/${commitmentId}/change-orders`)
frontend/src/app/(main)/[projectId]/commitments/page.tsx:334 — /api/projects/${projectId}/commitment-change-orders — page (main) — fetch(`/api/projects/${projectId}/commitment-change-orders`)
frontend/src/app/(main)/[projectId]/commitments/page.tsx:383 — /api/commitments/${id} — page (main) — const resp = await fetch(`/api/commitments/${id}`, {
frontend/src/app/(main)/[projectId]/commitments/page.tsx:402 — /api/sync/acumatica/commitments — page (main) — const resp = await fetch("/api/sync/acumatica/commitments", {
frontend/src/app/(main)/[projectId]/commitments/page.tsx:548 — /api/commitments/${id} — page (main) — const response = await fetch(`/api/commitments/${id}`, {
frontend/src/app/(main)/[projectId]/commitments/recycle-bin/page.tsx:108 — /api/commitments/${id}/restore — page (main) — const response = await fetch(`/api/commitments/${id}/restore`, { method: "POST" });
frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:223 — /api/sync/acumatica/direct-costs — page (main) — const resp = await fetch("/api/sync/acumatica/direct-costs", {
frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:348 — /api/projects/${projectId}/direct-costs/${directCostToDelete.id} — page (main) — const response = await fetch(`/api/projects/${projectId}/direct-costs/${directCostToDelete.id}`, {
frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:371 — /api/projects/${projectId}/direct-costs/${costId} — page (main) — const response = await fetch(`/api/projects/${projectId}/direct-costs/${costId}`);
frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:403 — /api/projects/${projectId}/direct-costs/${costId} — page (main) — const response = await fetch(`/api/projects/${projectId}/direct-costs/${costId}`, {
frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:429 — /api/projects/${projectId}/direct-costs/bulk — page (main) — const response = await fetch(`/api/projects/${projectId}/direct-costs/bulk`, {
frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:466 — /api/projects/${projectId}/direct-costs/bulk — page (main) — const response = await fetch(`/api/projects/${projectId}/direct-costs/bulk`, {
frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx:341 — /api/projects/${projectId}/drawings/${drawingId}/download — page (main) — fetch(`/api/projects/${projectId}/drawings/${drawingId}/download`)
frontend/src/app/(main)/[projectId]/drawings/viewer/[drawingId]/page.tsx:280 — /api/projects/${projectId}/drawings/${drawingId}/download — page (main) — const response = await fetch(`/api/projects/${projectId}/drawings/${drawingId}/download`);
frontend/src/app/(main)/[projectId]/estimates/new/page.tsx:77 — /api/projects/${projectId}/estimates — page (main) — const response = await fetch(`/api/projects/${projectId}/estimates`, {
frontend/src/app/(main)/[projectId]/home/project-home-client.tsx:831 — /api/projects/${project.id} — page (main) — const res = await fetch(`/api/projects/${project.id}`);
frontend/src/app/(main)/[projectId]/invoices/new/page.tsx:225 — /api/invoices — page (main) — const response = await fetch("/api/invoices", {
frontend/src/app/(main)/[projectId]/invoicing/new/page.tsx:70 — /api/projects/${projectId}/contracts — page (main) — const res = await fetch(`/api/projects/${projectId}/contracts`);
frontend/src/app/(main)/[projectId]/invoicing/new/page.tsx:103 — /api/projects/${projectId}/invoicing/owner — page (main) — const res = await fetch(`/api/projects/${projectId}/invoicing/owner`, {
frontend/src/app/(main)/[projectId]/invoicing/page.tsx:851 — /api/projects/${projectId}/invoicing/billing-periods — page (main) — const resp = await fetch(`/api/projects/${projectId}/invoicing/billing-periods`);
frontend/src/app/(main)/[projectId]/invoicing/page.tsx:862 — /api/projects/${projectId}/contracts — page (main) — const resp = await fetch(`/api/projects/${projectId}/contracts`);
frontend/src/app/(main)/[projectId]/invoicing/page.tsx:909 — /api/sync/acumatica/ar-invoices — page (main) — const resp = await fetch("/api/sync/acumatica/ar-invoices", {
frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx:145 — /api/projects/${projectId}/subcontracts — page (main) — fetch(`/api/projects/${projectId}/subcontracts`).then((r) => r.json()),
frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx:146 — /api/projects/${projectId}/purchase-orders — page (main) — fetch(`/api/projects/${projectId}/purchase-orders`).then((r) => r.json()),
frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx:186 — /api/commitments/${commitmentId} — page (main) — fetch(`/api/commitments/${commitmentId}`),
frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx:187 — /api/commitments/${commitmentId}/invoices — page (main) — fetch(`/api/commitments/${commitmentId}/invoices`),
frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx:188 — /api/commitments/${commitmentId}/change-orders — page (main) — fetch(`/api/commitments/${commitmentId}/change-orders`),
frontend/src/app/(main)/[projectId]/meetings/formatted-transcript.tsx:239 — /api/notes/highlight — page (main) — const response = await fetch("/api/notes/highlight", {
frontend/src/app/(main)/[projectId]/submittals/page.tsx:85 — /api/projects/${projectId}/submittals/packages — page (main) — fetch(`/api/projects/${projectId}/submittals/packages`)
frontend/src/app/(main)/[projectId]/submittals/page.tsx:166 — /api/projects/${projectId}/submittals/specs — page (main) — fetch(`/api/projects/${projectId}/submittals/specs`)
frontend/src/app/(main)/[projectId]/submittals/page.tsx:529 — /api/projects/${projectId}/submittals/${submittalId}/restore — page (main) — const res = await fetch(`/api/projects/${projectId}/submittals/${submittalId}/restore`, {
frontend/src/app/(main)/create-project/page.tsx:162 — /api/projects — page (main) — const response = await fetch("/api/projects", {
frontend/src/app/(main)/directory/companies/[companyId]/page.tsx:297 — /api/directory/companies/${companyId}/details — page (main) — const response = await fetch(`/api/directory/companies/${companyId}/details`, {
frontend/src/app/(main)/directory/companies/[companyId]/page.tsx:349 — /api/projects?limit=200&archived=false — page (main) — const response = await fetch("/api/projects?limit=200&archived=false", {
frontend/src/app/(main)/directory/companies/[companyId]/page.tsx:378 — /api/directory/companies/${data.company.id} — page (main) — const response = await fetch(`/api/directory/companies/${data.company.id}`, {
frontend/src/app/(main)/directory/companies/[companyId]/page.tsx:550 — /api/directory/companies/${data.company.id}/add-to-project — page (main) — const response = await fetch(`/api/directory/companies/${data.company.id}/add-to-project`, {
frontend/src/app/(main)/directory/companies/page.tsx:424 — /api/sync/acumatica/vendors — page (main) — const resp = await fetch("/api/sync/acumatica/vendors", { method: "POST" });
frontend/src/app/(main)/directory/companies/page.tsx:497 — /api/directory/companies/${company.id} — page (main) — const resp = await fetch(`/api/directory/companies/${company.id}`, { method: "DELETE" });
frontend/src/app/(main)/directory/vendors/page.tsx:492 — /api/directory/vendors?${params.toString()} — page (main) — const response = await fetch(`/api/directory/vendors?${params.toString()}`, {
frontend/src/app/(main)/directory/vendors/page.tsx:559 — /api/sync/acumatica/vendors — page (main) — const resp = await fetch("/api/sync/acumatica/vendors", { method: "POST" });
frontend/src/app/(main)/page.tsx:503 — /api/projects?${pagedParams.toString()} — page (main) — const response = await fetch(`/api/projects?${pagedParams.toString()}`);
frontend/src/app/(main)/page.tsx:543 — /api/projects/${projectId} — page (main) — const res = await fetch(`/api/projects/${projectId}`, {
frontend/src/app/(main)/page.tsx:949 — /api/projects/${project.id} — page (main) — const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
frontend/src/app/(main)/page.tsx:973 — /api/projects/${projectId} — page (main) — const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
frontend/src/app/(main)/pipeline/page.tsx:125 — /api/documents/status — page (main) — const response = await fetch("/api/documents/status");
frontend/src/app/(main)/pipeline/page.tsx:139 — /api/documents/trigger-pipeline — page (main) — const response = await fetch("/api/documents/trigger-pipeline");
frontend/src/app/(main)/pipeline/page.tsx:176 — /api/documents/trigger-pipeline — page (main) — const response = await fetch("/api/documents/trigger-pipeline", {
frontend/src/app/(main)/settings/account/page.tsx:67 — /api/company/logo — page (main) — const res = await fetch("/api/company/logo", {
frontend/src/app/(main)/settings/memory/page.tsx:230 — /api/ai-assistant/memories?${params} — page (main) — const res = await fetch(`/api/ai-assistant/memories?${params}`);
frontend/src/app/(main)/settings/memory/page.tsx:247 — /api/ai-assistant/memories/${id} — page (main) — const res = await fetch(`/api/ai-assistant/memories/${id}`, {
frontend/src/app/(main)/settings/memory/page.tsx:257 — /api/ai-assistant/memories/${id} — page (main) — const res = await fetch(`/api/ai-assistant/memories/${id}`, {
frontend/src/app/(main)/settings/users/[userId]/page.tsx:121 — /api/settings/users/${userId} — page (main) — const res = await fetch(`/api/settings/users/${userId}`);
frontend/src/app/(main)/settings/users/[userId]/page.tsx:152 — /api/settings/users/${userId} — page (main) — const res = await fetch(`/api/settings/users/${userId}`, {
frontend/src/app/(main)/settings/users/[userId]/page.tsx:175 — /api/settings/users/${userId} — page (main) — const res = await fetch(`/api/settings/users/${userId}`, {
frontend/src/app/(main)/settings/users/[userId]/page.tsx:192 — /api/settings/users/${userId} — page (main) — const res = await fetch(`/api/settings/users/${userId}`, { method: "DELETE" });
frontend/src/app/(main)/settings/users/page.tsx:112 — /api/settings/users/${profile.id} — page (main) — const res = await fetch(`/api/settings/users/${profile.id}`, {
frontend/src/app/(main)/settings/users/page.tsx:128 — /api/settings/users/${profile.id} — page (main) — const res = await fetch(`/api/settings/users/${profile.id}`, { method: "DELETE" });
frontend/src/app/(main)/settings/users/page.tsx:141 — /api/settings/users/invite — page (main) — const res = await fetch("/api/settings/users/invite", {
frontend/src/app/(tables)/documents/page.tsx:234 — /api/documents/status — page (tables) — const resp = await fetch("/api/documents/status", { cache: "no-store" });
frontend/src/app/(tables)/documents/page.tsx:252 — /api/projects?fields=id,name — page (tables) — const resp = await fetch("/api/projects?fields=id,name", {
frontend/src/app/(tables)/documents/page.tsx:274 — /api/documents/${docId}/assign-project — page (tables) — const resp = await fetch(`/api/documents/${docId}/assign-project`, {
frontend/src/app/(tables)/documents/page.tsx:306 — /api/documents/${docId}/assign-project — page (tables) — const resp = await fetch(`/api/documents/${docId}/assign-project`, {
frontend/src/app/(tables)/documents/page.tsx:410 — /api/documents/${doc.id} — page (tables) — const resp = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
frontend/src/app/(tables)/projects/page.tsx:74 — /api/projects?${pagedParams.toString()} — page (tables) — const response = await fetch(`/api/projects?${pagedParams.toString()}`);
frontend/src/app/(tables)/projects/page.tsx:227 — /api/projects/bootstrap — page (tables) — const response = await fetch("/api/projects/bootstrap", {
frontend/src/app/(tables)/projects/page.tsx:251 — /api/projects?${params.toString()} — page (tables) — const refreshResponse = await fetch(`/api/projects?${params.toString()}`);
frontend/src/app/(tables)/tasks/page.tsx:158 — /api/tasks — page (tables) — const resp = await fetch("/api/tasks", { cache: "no-store" });
frontend/src/app/(tables)/tasks/page.tsx:237 — /api/tasks/${item.id} — page (tables) — const resp = await fetch(`/api/tasks/${item.id}`, { method: "DELETE" });
frontend/src/app/(tables)/tasks/page.tsx:275 — /api/tasks/bulk — page (tables) — const resp = await fetch("/api/tasks/bulk", {
frontend/src/components/admin-feedback/AdminFeedbackWidget.tsx:329 — /api/admin/feedback — component — const response = await fetch("/api/admin/feedback", {
frontend/src/components/ai-assistant/chat-area.tsx:842 — /api/ai-assistant/feedback — component — fetch("/api/ai-assistant/feedback", {
frontend/src/components/ai-assistant/chat-area.tsx:896 — /api/ai-assistant/memories/${memoryId} — component — const response = await fetch(`/api/ai-assistant/memories/${memoryId}`, {
frontend/src/components/ai-assistant/cross-source-timeline.tsx:80 — /api/ai-assistant/timeline?${queryString} — component — const response = await fetch(`/api/ai-assistant/timeline?${queryString}`);
frontend/src/components/ai-assistant/rag-chat-page.tsx:260 — /api/ai-assistant/messages/${sessionId} — component — const res = await fetch(`/api/ai-assistant/messages/${sessionId}`);
frontend/src/components/artifact.tsx:152 — /api/document?id=${artifact.documentId} — component — await fetch(`/api/document?id=${artifact.documentId}`, {
frontend/src/components/budget/BudgetLineItemCreatorModal.tsx:171 — /api/projects/${projectId}/budget-codes — component — const response = await fetch(`/api/projects/${projectId}/budget-codes`);
frontend/src/components/budget/BudgetLineItemCreatorModal.tsx:391 — /api/projects/${projectId}/budget-codes — component — const response = await fetch(`/api/projects/${projectId}/budget-codes`, {
frontend/src/components/budget/BudgetViewsManager.tsx:54 — /api/projects/${projectId}/budget/views — component — const response = await fetch(`/api/projects/${projectId}/budget/views`, {
frontend/src/components/budget/ImportBudgetModal.tsx:167 — /api/projects/${projectId}/budget/import — component — const response = await fetch(`/api/projects/${projectId}/budget/import`, {
frontend/src/components/budget/InlineBudgetLineItemCreator.tsx:136 — /api/projects/${projectId}/budget-codes — component — const response = await fetch(`/api/projects/${projectId}/budget-codes`);
frontend/src/components/budget/InlineBudgetLineItemCreator.tsx:323 — /api/projects/${projectId}/budget-codes — component — const response = await fetch(`/api/projects/${projectId}/budget-codes`, {
frontend/src/components/budget/budget-line-item-modal.tsx:218 — /api/projects/${projectId}/budget-codes — component — const response = await fetch(`/api/projects/${projectId}/budget-codes`);
frontend/src/components/budget/budget-line-item-modal.tsx:277 — /api/projects/${projectId}/budget-codes — component — const response = await fetch(`/api/projects/${projectId}/budget-codes`, {
frontend/src/components/budget/budget-line-item-modal.tsx:432 — /api/projects/${projectId}/budget — component — const response = await fetch(`/api/projects/${projectId}/budget`, {
frontend/src/components/budget/budget-modification-modal.tsx:76 — /api/projects/${projectId}/budget — component — const response = await fetch(`/api/projects/${projectId}/budget`);
frontend/src/components/budget/change-history-tab.tsx:53 — /api/projects/${projectId}/budget/history — component — const response = await fetch(`/api/projects/${projectId}/budget/history`);
frontend/src/components/budget/cost-codes-tab.tsx:596 — /api/projects/${projectId}/budget — component — const res = await fetch(`/api/projects/${projectId}/budget`, {
frontend/src/components/budget/enhanced-budget-line-item-modal.tsx:226 — /api/projects/${projectId}/budget — component — const response = await fetch(`/api/projects/${projectId}/budget`, {
frontend/src/components/chat/chat-layout.tsx:46 — /api/team-chat/previews — component — fetch("/api/team-chat/previews")
frontend/src/components/chat/chat-main.tsx:56 — /api/team-chat/messages?channel=${encodeURIComponent(channel.id)} — component — fetch(`/api/team-chat/messages?channel=${encodeURIComponent(channel.id)}`)
frontend/src/components/chat/chat-main.tsx:110 — /api/team-chat/messages — component — fetch("/api/team-chat/messages", {
frontend/src/components/chat/simple-rag-chat.tsx:102 — /api/ai-assistant/messages/${savedSession} — component — fetch(`/api/ai-assistant/messages/${savedSession}`)
frontend/src/components/chat/simple-rag-chat.tsx:120 — /api/ai-assistant/conversations — component — const response = await fetch("/api/ai-assistant/conversations", {
frontend/src/components/commitments/EmailCommitmentDialog.tsx:174 — /api/commitments/${commitmentId}/email — component — const response = await fetch(`/api/commitments/${commitmentId}/email`, {
frontend/src/components/commitments/tabs/AttachmentsTab.tsx:39 — /api/commitments/${commitmentId}/attachments — component — const response = await fetch(`/api/commitments/${commitmentId}/attachments`);
frontend/src/components/commitments/tabs/AttachmentsTab.tsx:66 — /api/commitments/${commitmentId}/attachments — component — const response = await fetch(`/api/commitments/${commitmentId}/attachments`, {
frontend/src/components/commitments/tabs/ChangeManagementTab.tsx:170 — /api/commitments/${commitmentId}/change-orders — component — const res = await fetch(`/api/commitments/${commitmentId}/change-orders`)
frontend/src/components/commitments/tabs/ChangeOrdersTab.tsx:56 — /api/commitments/${commitmentId}/change-orders — component — const response = await fetch(`/api/commitments/${commitmentId}/change-orders`)
frontend/src/components/commitments/tabs/RelatedItemsTab.tsx:115 — /api/commitments/${commitmentId}/related-items — component — const res = await fetch(`/api/commitments/${commitmentId}/related-items`);
frontend/src/components/commitments/tabs/RelatedItemsTab.tsx:161 — /api/commitments/${commitmentId}/related-items — component — const res = await fetch(`/api/commitments/${commitmentId}/related-items`, {
frontend/src/components/commitments/tabs/RfqsTab.tsx:52 — /api/commitments/${commitmentId}/rfqs — component — const response = await fetch(`/api/commitments/${commitmentId}/rfqs`);
frontend/src/components/daily-log/CreateDialogs.tsx:26 — /api/table-insert — component — const res = await fetch("/api/table-insert", {
frontend/src/components/daily-log/CreateDialogs.tsx:72 — /api/table-insert — component — const res = await fetch("/api/table-insert", {
frontend/src/components/daily-log/CreateDialogs.tsx:128 — /api/table-insert — component — const res = await fetch("/api/table-insert", {
frontend/src/components/daily-log/CreateDialogs.tsx:180 — /api/table-insert — component — const res = await fetch("/api/table-insert", {
frontend/src/components/dev/design-violation-overlay.tsx:97 — /api/dev/violations?status=open,in_progress,fixed — component — const res = await fetch("/api/dev/violations?status=open,in_progress,fixed");
frontend/src/components/dev/design-violation-overlay.tsx:239 — /api/dev/violations — component — fetch("/api/dev/violations", {
frontend/src/components/dev/design-violation-overlay.tsx:264 — /api/dev/violations — component — const res = await fetch("/api/dev/violations", {
frontend/src/components/dev/dev-annotation-overlay.tsx:54 — /api/dev/annotate?status=all — component — const res = await fetch("/api/dev/annotate?status=all");
frontend/src/components/dev/dev-annotation-overlay.tsx:101 — /api/dev/annotate — component — const res = await fetch("/api/dev/annotate", {
frontend/src/components/dev-panel/AnnotationsTab.tsx:47 — /api/dev-panel/annotations?url=${encodeURIComponent(pageUrl)} — component — const res = await fetch(`/api/dev-panel/annotations?url=${encodeURIComponent(pageUrl)}`);
frontend/src/components/dev-panel/ChatTab.tsx:43 — /api/rag-chat — component — const res = await fetch("/api/rag-chat", {
frontend/src/components/dev-panel/CommentsTab.tsx:63 — /api/dev-panel/comments/${feature} — component — fetch(`/api/dev-panel/comments/${feature}`)
frontend/src/components/dev-panel/CommentsTab.tsx:92 — /api/dev-panel/comments/${feature} — component — await fetch(`/api/dev-panel/comments/${feature}`, {
frontend/src/components/dev-panel/FeedbackTab.tsx:56 — /api/dev-panel/feedback/${feature} — component — fetch(`/api/dev-panel/feedback/${feature}`)
frontend/src/components/dev-panel/GapsTab.tsx:78 — /api/dev-panel/gaps/${feature} — component — fetch(`/api/dev-panel/gaps/${feature}`)
frontend/src/components/dev-panel/OverviewTab.tsx:335 — /api/dev-panel/spec/${feature} — component — fetch(`/api/dev-panel/spec/${feature}`)
frontend/src/components/dev-panel/ScreenshotsPageTab.tsx:272 — /api/procore-screenshots/${feature} — component — fetch(`/api/procore-screenshots/${feature}`).then((r) => r.json()),
frontend/src/components/dev-panel/ScreenshotsPageTab.tsx:273 — /api/dev-panel/spec/${feature} — component — fetch(`/api/dev-panel/spec/${feature}`).then((r) => r.json()),
frontend/src/components/dev-panel/ScreenshotsTab.tsx:39 — /api/procore-screenshots/${feature} — component — fetch(`/api/procore-screenshots/${feature}`)
frontend/src/components/dev-panel/SpecTab.tsx:147 — /api/dev-panel/spec/${feature} — component — fetch(`/api/dev-panel/spec/${feature}`)
frontend/src/components/dev-panel/TestCasesTab.tsx:181 — /api/testing/suites/${slug}/cases?${params} — component — fetch(`/api/testing/suites/${slug}/cases?${params}`)
frontend/src/components/dev-tools/dev-panel.tsx:90 — /api/projects/${params.projectId}/budget — component — const response = await fetch(`/api/projects/${params.projectId}/budget`)
frontend/src/components/dev-tools/enhanced-dev-panel.tsx:342 — /api/projects/${params.projectId}/budget — component — const response = await fetch(`/api/projects/${params.projectId}/budget`)
frontend/src/components/dev-tools/enhanced-dev-panel.tsx:387 — /api/dev-tools/check-routes — component — const response = await fetch("/api/dev-tools/check-routes")
frontend/src/components/dev-tools/enhanced-dev-panel.tsx:398 — /api/dev-tools/clear-cache — component — const response = await fetch("/api/dev-tools/clear-cache", { method: "POST" })
frontend/src/components/dev-tools/enhanced-dev-panel.tsx:412 — /api/dev-tools/regenerate-types — component — const response = await fetch("/api/dev-tools/regenerate-types", { method: "POST" })
frontend/src/components/dev-tools/test-runs-tab.tsx:70 — /api/dev/test-suites/${tool} — component — const res = await fetch(`/api/dev/test-suites/${tool}`);
frontend/src/components/dev-tools/test-runs-tab.tsx:90 — /api/dev/test-runs — component — const res = await fetch("/api/dev/test-runs", {
frontend/src/components/dev-tools/test-runs-tab.tsx:98 — /api/dev/test-runs/${run.id} — component — const detail = await fetch(`/api/dev/test-runs/${run.id}`);
frontend/src/components/dev-tools/test-runs-tab.tsx:123 — /api/dev/test-results/${resultId} — component — const res = await fetch(`/api/dev/test-results/${resultId}`, {
frontend/src/components/direct-costs/DirectCostForm.tsx:264 — /api/projects/${projectId}/vendors — component — fetch(`/api/projects/${projectId}/vendors`),
frontend/src/components/direct-costs/DirectCostForm.tsx:265 — /api/projects/${projectId}/employees — component — fetch(`/api/projects/${projectId}/employees`),
frontend/src/components/direct-costs/DirectCostForm.tsx:266 — /api/projects/${projectId}/budget-codes — component — fetch(`/api/projects/${projectId}/budget-codes`),
frontend/src/components/direct-costs/DirectCostForm.tsx:295 — /api/projects/${projectId}/budget-codes — component — const response = await fetch(`/api/projects/${projectId}/budget-codes`)
frontend/src/components/direct-costs/DirectCostsImportDialog.tsx:203 — /api/projects/${projectId}/vendors — component — fetch(`/api/projects/${projectId}/vendors`),
frontend/src/components/direct-costs/DirectCostsImportDialog.tsx:204 — /api/projects/${projectId}/employees — component — fetch(`/api/projects/${projectId}/employees`),
frontend/src/components/direct-costs/DirectCostsImportDialog.tsx:205 — /api/projects/${projectId}/budget-codes — component — fetch(`/api/projects/${projectId}/budget-codes`),
frontend/src/components/direct-costs/DirectCostsImportDialog.tsx:393 — /api/projects/${projectId}/direct-costs — component — const response = await fetch(`/api/projects/${projectId}/direct-costs`, {
frontend/src/components/domain/change-events/ChangeEventConvertDialog.tsx:112 — /api/projects/${projectId}/contracts — component — fetch(`/api/projects/${projectId}/contracts`),
frontend/src/components/domain/change-events/ChangeEventConvertDialog.tsx:113 — /api/commitments?projectId=${projectId}&limit=500 — component — fetch(`/api/commitments?projectId=${projectId}&limit=500`),
frontend/src/components/domain/change-events/ChangeEventConvertDialog.tsx:180 — /api/projects/${projectId}/change-events/add-to-pco — component — const response = await fetch(`/api/projects/${projectId}/change-events/add-to-pco`, {
frontend/src/components/domain/change-events/ChangeEventExpandedRow.tsx:174 — /api/projects/${projectId}/change-events/${changeEventId}/line-items — component — fetch(`/api/projects/${projectId}/change-events/${changeEventId}/line-items`),
frontend/src/components/domain/change-events/ChangeEventExpandedRow.tsx:176 — /api/projects/${projectId}/vertical-markup — component — ? fetch(`/api/projects/${projectId}/vertical-markup`).catch(() => null)
frontend/src/components/domain/change-events/ChangeEventRevenueSection.tsx:50 — /api/projects/${projectId}/contracts — component — const response = await fetch(`/api/projects/${projectId}/contracts`);
frontend/src/components/domain/change-events/change-event-form/AddCompanyModal.tsx:29 — /api/projects/${projectId}/vendors — component — const response = await fetch(`/api/projects/${projectId}/vendors`, {
frontend/src/components/domain/change-events/change-event-form/GeneralInfoSection.tsx:64 — /api/projects/${projectId}/change-events/origin-options?type=${formData.origin} — component — fetch(`/api/projects/${projectId}/change-events/origin-options?type=${formData.origin}`)
frontend/src/components/domain/change-events/change-event-form/useDropdownData.ts:26 — /api/projects/${projectId}/vendors — component — const response = await fetch(`/api/projects/${projectId}/vendors`);
frontend/src/components/domain/change-events/change-event-form/useDropdownData.ts:37 — /api/projects/${projectId}/budget-codes — component — const response = await fetch(`/api/projects/${projectId}/budget-codes`);
frontend/src/components/domain/change-events/change-event-form/useDropdownData.ts:66 — /api/projects/${projectId}/contracts — component — const response = await fetch(`/api/projects/${projectId}/contracts`);
frontend/src/components/domain/change-events/change-event-form/useDropdownData.ts:103 — /api/projects/${projectId}/purchase-orders — component — fetch(`/api/projects/${projectId}/purchase-orders`),
frontend/src/components/domain/change-events/change-event-form/useDropdownData.ts:104 — /api/projects/${projectId}/subcontracts — component — fetch(`/api/projects/${projectId}/subcontracts`),
frontend/src/components/domain/contracts/ContractForm.tsx:442 — /api/projects/${projectId}/budget-codes — component — const response = await fetch(`/api/projects/${projectId}/budget-codes`, {
frontend/src/components/domain/contracts/CreatePurchaseOrderForm.tsx:196 — /api/projects/${projectId}/vendors — component — const response = await fetch(`/api/projects/${projectId}/vendors`);
frontend/src/components/domain/contracts/CreatePurchaseOrderForm.tsx:279 — /api/projects/${projectId}/budget-codes — component — const response = await fetch(`/api/projects/${projectId}/budget-codes`);
frontend/src/components/domain/contracts/CreatePurchaseOrderForm.tsx:374 — /api/projects/${projectId}/budget-codes — component — const response = await fetch(`/api/projects/${projectId}/budget-codes`, {
frontend/src/components/domain/contracts/ImportFromBudgetModal.tsx:68 — /api/projects/${projectId}/budget — component — const response = await fetch(`/api/projects/${projectId}/budget`);
frontend/src/components/domain/contracts/subcontract-form/CreateBudgetCodeModal.tsx:128 — /api/projects/${projectId}/budget-codes — component — const response = await fetch(`/api/projects/${projectId}/budget-codes`, {
frontend/src/components/domain/contracts/subcontract-form/useSubcontractFormState.ts:91 — /api/projects/${projectId}/subcontracts — component — const res = await fetch(`/api/projects/${projectId}/subcontracts`);
frontend/src/components/domain/contracts/subcontract-form/useSubcontractFormState.ts:128 — /api/companies — component — const response = await fetch(`/api/companies`);
frontend/src/components/domain/contracts/subcontract-form/useSubcontractFormState.ts:216 — /api/projects/${projectId}/budget-codes — component — const response = await fetch(`/api/projects/${projectId}/budget-codes`);
frontend/src/components/drawings/DrawingUploadDialog.tsx:132 — /api/projects/${projectId}/drawings/sets — component — const res = await fetch(`/api/projects/${projectId}/drawings/sets`, {
frontend/src/components/drawings/DrawingUploadDialog.tsx:176 — /api/projects/${projectId}/drawings — component — const res = await fetch(`/api/projects/${projectId}/drawings`, {
frontend/src/components/header/procore-reference-panel.tsx:112 — /api/dev-panel/spec/${feature} — component — fetch(`/api/dev-panel/spec/${feature}`).then((r) => r.json()),
frontend/src/components/header/procore-reference-panel.tsx:113 — /api/dev-panel/gaps/${feature} — component — fetch(`/api/dev-panel/gaps/${feature}`).then((r) => r.json()),
frontend/src/components/header/procore-reference-panel.tsx:259 — /api/dev-panel/gaps/${feature} — component — fetch(`/api/dev-panel/gaps/${feature}`)
frontend/src/components/header/procore-reference-panel.tsx:266 — /api/dev-panel/feedback/${feature} — component — fetch(`/api/dev-panel/feedback/${feature}`)
frontend/src/components/header/procore-reference-panel.tsx:273 — /api/dev-panel/comments/${feature} — component — fetch(`/api/dev-panel/comments/${feature}`)
frontend/src/components/header/procore-reference-panel.tsx:289 — /api/dev-tools/clear-cache — component — const res = await fetch("/api/dev-tools/clear-cache", { method: "POST" });
frontend/src/components/header/procore-reference-panel.tsx:297 — /api/dev-tools/regenerate-types — component — const res = await fetch("/api/dev-tools/regenerate-types", { method: "POST" });
frontend/src/components/header/procore-reference-panel.tsx:306 — /api/dev-tools/check-routes — component — const res = await fetch("/api/dev-tools/check-routes");
frontend/src/components/header/use-header-nav.ts:535 — /api/directory/vendors/${vendorId} — component — const response = await fetch(`/api/directory/vendors/${vendorId}`);
frontend/src/components/header/use-header-nav.ts:644 — /api/meetings/${meetingId} — component — const response = await fetch(`/api/meetings/${meetingId}`);
frontend/src/components/header/use-header-nav.ts:748 — /api/commitments/${commitmentId} — component — const response = await fetch(`/api/commitments/${commitmentId}`);
frontend/src/components/header/use-header-nav.ts:1042 — /api/settings/users/${userId} — component — const response = await fetch(`/api/settings/users/${userId}`);
frontend/src/components/header/use-header-nav.ts:1206 — /api/projects/${projectId} — component — const response = await fetch(`/api/projects/${projectId}`);
frontend/src/components/issue-tracker/pages/Providers.tsx:19 — /api/users?${searchParams} — component — const response = await fetch(`/api/users?${searchParams}`);
frontend/src/components/message-actions.tsx:80 — /api/vote — component — const upvote = fetch("/api/vote", {
frontend/src/components/message-actions.tsx:129 — /api/vote — component — const downvote = fetch("/api/vote", {
frontend/src/components/misc/backend-status-indicator.tsx:24 — /api/health — component — const response = await fetch("/api/health", {
frontend/src/components/misc/login-form.tsx:75 — /api/auth/post-login-redirect — component — const res = await fetch("/api/auth/post-login-redirect");
frontend/src/components/misc/login-page-v2.tsx:52 — /api/auth/post-login-redirect — component — const response = await fetch("/api/auth/post-login-redirect");
frontend/src/components/misc/profile-image-upload.tsx:86 — /api/profile/avatar — component — const response = await fetch("/api/profile/avatar", {
frontend/src/components/misc/profile-image-upload.tsx:131 — /api/profile/avatar — component — const response = await fetch("/api/profile/avatar", {
frontend/src/components/misc/sign-up-form.tsx:50 — /api/auth/signup — component — const response = await fetch("/api/auth/signup", {
frontend/src/components/multimodal-input.tsx:191 — /api/files/upload — component — const response = await fetch("/api/files/upload", {
frontend/src/components/portfolio/edit-project-dialog.tsx:392 — /api/projects/${project.id} — component — const response = await fetch(`/api/projects/${project.id}`, {
frontend/src/components/procore-docs/docs-chat.tsx:124 — /api/procore-docs/ask — component — const response = await fetch("/api/procore-docs/ask", {
frontend/src/components/project/edit-project-sidebar.tsx:294 — /api/projects/${project.id} — component — const res = await fetch(`/api/projects/${project.id}`, {
frontend/src/components/project-setup-wizard/budget-setup.tsx:229 — /api/projects/${projectId}/budget — component — const response = await fetch(`/api/projects/${projectId}/budget`, {
frontend/src/components/sidebar-history.tsx:133 — /api/chat?id=${chatToDelete} — component — const deletePromise = fetch(`/api/chat?id=${chatToDelete}`, {
frontend/src/components/tables/GenericTableWithDelete.tsx:17 — /api/table-delete — component — const res = await fetch("/api/table-delete", {
frontend/src/components/tables/generic-table-factory.tsx:1296 — /api/table-update — component — const response = await fetch("/api/table-update", {
frontend/src/components/tables/generic-table-factory.tsx:1371 — /api/table-update — component — const response = await fetch("/api/table-update", {
frontend/src/components/templates/StandardFormPage.tsx:175 — /api/projects/${projectId}/your-endpoint — component — const response = await fetch(`/api/projects/${projectId}/your-endpoint`, {
frontend/src/contexts/project-context.tsx:76 — /api/projects/${projectIdFromUrl} — contexts — const response = await fetch(`/api/projects/${projectIdFromUrl}`, {
frontend/src/features/drawings/drawings-table-config.tsx:289 — /api/projects/${item.projectId}/drawings/${item.id}/download — features — fetch(`/api/projects/${item.projectId}/drawings/${item.id}/download`)
frontend/src/features/invoicing/payments-tab.tsx:153 — /api/projects/${projectId}/invoicing/owner — features — const res = await fetch(`/api/projects/${projectId}/invoicing/owner`);
frontend/src/features/submittals/submittal-form-dialog.tsx:155 — /api/projects/${projectId}/submittals/packages — features — const res = await fetch(`/api/projects/${projectId}/submittals/packages`);
frontend/src/features/submittals/submittal-form-page.tsx:149 — /api/projects/${projectId}/submittals/packages — features — const res = await fetch(`/api/projects/${projectId}/submittals/packages`);
frontend/src/hooks/use-budget-data.ts:47 — /api/projects/${projectId}/budget — hook — const response = await fetch(`/api/projects/${projectId}/budget`);
frontend/src/hooks/use-commitments-query.ts:84 — /api/commitments?${params} — hook — const response = await fetch(`/api/commitments?${params}`);
frontend/src/hooks/use-commitments-query.ts:118 — /api/commitments/${commitmentId} — hook — const response = await fetch(`/api/commitments/${commitmentId}`);
frontend/src/hooks/use-commitments-query.ts:197 — /api/commitments/${commitmentId} — hook — const response = await fetch(`/api/commitments/${commitmentId}`, {
frontend/src/hooks/use-commitments-query.ts:252 — /api/commitments/${input.id} — hook — const response = await fetch(`/api/commitments/${input.id}`, {
frontend/src/hooks/use-company-knowledge.ts:114 — /api/admin/company-context — hook — const res = await fetch("/api/admin/company-context");
frontend/src/hooks/use-company-knowledge.ts:126 — /api/admin/company-context — hook — const res = await fetch("/api/admin/company-context", {
frontend/src/hooks/use-company-knowledge.ts:173 — /api/knowledge?${params.toString()} — hook — const res = await fetch(`/api/knowledge?${params.toString()}`);
frontend/src/hooks/use-company-knowledge.ts:193 — /api/knowledge — hook — const res = await fetch("/api/knowledge", {
frontend/src/hooks/use-company-knowledge.ts:220 — /api/knowledge — hook — const res = await fetch("/api/knowledge", {
frontend/src/hooks/use-documents.ts:126 — /api/projects/${projectId}/documents — hook — const res = await fetch(`/api/projects/${projectId}/documents`, {
frontend/src/hooks/use-drawing-areas.ts:40 — /api/projects/${projectId}/drawings/areas/${areaId} — hook — const response = await fetch(`/api/projects/${projectId}/drawings/areas/${areaId}`);
frontend/src/hooks/use-drawing-pins.ts:27 — /api/projects/${projectId}/drawings/${drawingId}/pins — hook — const res = await fetch(`/api/projects/${projectId}/drawings/${drawingId}/pins`);
frontend/src/hooks/use-drawing-pins.ts:52 — /api/projects/${projectId}/drawings/${drawingId}/pins — hook — const res = await fetch(`/api/projects/${projectId}/drawings/${drawingId}/pins`, {
frontend/src/hooks/use-emails.ts:105 — /api/projects/${projectId}/emails — hook — const res = await fetch(`/api/projects/${projectId}/emails`, {
frontend/src/hooks/use-estimates.ts:101 — /api/projects/${projectId}/estimates — hook — const res = await fetch(`/api/projects/${projectId}/estimates`, {
frontend/src/hooks/use-financial-insights.ts:115 — /api/financial-insights/scan — hook — const res = await fetch("/api/financial-insights/scan", {
frontend/src/hooks/use-financial-insights.ts:136 — /api/financial-insights/cross-reference — hook — const res = await fetch("/api/financial-insights/cross-reference", {
frontend/src/hooks/use-global-project-companies.ts:65 — /api/directory/project-companies?${params.toString()} — hook — const response = await fetch(`/api/directory/project-companies?${params.toString()}`);
frontend/src/hooks/use-initiative-cards.ts:41 — /api/initiative-cards — hook — const res = await fetch("/api/initiative-cards");
frontend/src/hooks/use-initiative-cards.ts:52 — /api/employees — hook — const res = await fetch("/api/employees");
frontend/src/hooks/use-initiative-cards.ts:64 — /api/initiative-cards — hook — const res = await fetch("/api/initiative-cards", {
frontend/src/hooks/use-initiative-cards.ts:86 — /api/initiative-cards/${id} — hook — const res = await fetch(`/api/initiative-cards/${id}`, {
frontend/src/hooks/use-initiative-cards.ts:105 — /api/initiative-cards/${id} — hook — const res = await fetch(`/api/initiative-cards/${id}`, {
frontend/src/hooks/use-initiative-cards.ts:124 — /api/initiative-cards — hook — const res = await fetch("/api/initiative-cards", {
frontend/src/hooks/use-initiative-cards.ts:143 — /api/initiative-cards/${cardId}/dispatch — hook — const res = await fetch(`/api/initiative-cards/${cardId}/dispatch`, {
frontend/src/hooks/use-meetings.ts:79 — /api/projects/${projectId}/meetings — hook — const response = await fetch(`/api/projects/${projectId}/meetings`);
frontend/src/hooks/use-meetings.ts:124 — /api/projects/${projectId}/meetings — hook — const response = await fetch(`/api/projects/${projectId}/meetings`, {
frontend/src/hooks/use-pcos.ts:103 — /api/projects/${projectId}/pcos — hook — const res = await fetch(`/api/projects/${projectId}/pcos`);
frontend/src/hooks/use-pcos.ts:122 — /api/projects/${projectId}/pcos/${pcoId} — hook — const res = await fetch(`/api/projects/${projectId}/pcos/${pcoId}`);
frontend/src/hooks/use-pcos.ts:166 — /api/projects/${projectId}/pcos — hook — const res = await fetch(`/api/projects/${projectId}/pcos`, {
frontend/src/hooks/use-pcos.ts:195 — /api/projects/${projectId}/pcos/${pcoId} — hook — const res = await fetch(`/api/projects/${projectId}/pcos/${pcoId}`, {
frontend/src/hooks/use-permissions.ts:34 — /api/projects/${projectId}/permissions — hook — const response = await fetch(`/api/projects/${projectId}/permissions`);
frontend/src/hooks/use-permissions.ts:87 — /api/permissions/templates — hook — const response = await fetch("/api/permissions/templates");
frontend/src/hooks/use-permissions.ts:109 — /api/projects/${projectId}/permissions/assign — hook — const response = await fetch(`/api/projects/${projectId}/permissions/assign`, {
frontend/src/hooks/use-photo-albums.ts:17 — /api/projects/${projectId}/photo-albums — hook — const res = await fetch(`/api/projects/${projectId}/photo-albums`);
frontend/src/hooks/use-photo-albums.ts:29 — /api/projects/${projectId}/photo-albums — hook — const res = await fetch(`/api/projects/${projectId}/photo-albums`, {
frontend/src/hooks/use-photo-albums.ts:54 — /api/projects/${projectId}/photo-albums/${albumId} — hook — const res = await fetch(`/api/projects/${projectId}/photo-albums/${albumId}`, {
frontend/src/hooks/use-photo-albums.ts:79 — /api/projects/${projectId}/photo-albums/${albumId} — hook — const res = await fetch(`/api/projects/${projectId}/photo-albums/${albumId}`, {
frontend/src/hooks/use-photos.ts:105 — /api/projects/${projectId}/photos — hook — const res = await fetch(`/api/projects/${projectId}/photos`, {
frontend/src/hooks/use-photos.ts:181 — /api/projects/${projectId}/photos/upload — hook — const res = await fetch(`/api/projects/${projectId}/photos/upload`, {
frontend/src/hooks/use-project-checklist.ts:18 — /api/projects/${projectId}/checklist — hook — const response = await fetch(`/api/projects/${projectId}/checklist`);
frontend/src/hooks/use-project-roles.ts:174 — /api/projects/${projectId}/directory/roles — hook — const response = await fetch(`/api/projects/${projectId}/directory/roles`, {
frontend/src/hooks/use-project-vendors.ts:44 — /api/projects/${projectId}/directory/vendors — hook — const res = await fetch(`/api/projects/${projectId}/directory/vendors`);
frontend/src/hooks/use-project-vendors.ts:66 — /api/projects/${projectId}/directory/vendors — hook — const res = await fetch(`/api/projects/${projectId}/directory/vendors`);
frontend/src/hooks/use-project-vendors.ts:90 — /api/projects/${projectId}/directory/vendors — hook — const res = await fetch(`/api/projects/${projectId}/directory/vendors`, {
frontend/src/hooks/use-rag-conversations.ts:20 — /api/ai-assistant/conversations — hook — const res = await fetch("/api/ai-assistant/conversations");
frontend/src/hooks/use-rag-conversations.ts:33 — /api/ai-assistant/conversations — hook — const res = await fetch("/api/ai-assistant/conversations", {
frontend/src/hooks/use-submittals.ts:160 — /api/projects/${projectId}/submittals — hook — const res = await fetch(`/api/projects/${projectId}/submittals`, {
frontend/src/hooks/use-transmittals.ts:98 — /api/projects/${projectId}/transmittals — hook — const res = await fetch(`/api/projects/${projectId}/transmittals`, {
frontend/src/hooks/useDirectoryPreferences.ts:26 — /api/projects/${projectId}/directory/filters — hook — fetch(`/api/projects/${projectId}/directory/filters`),
frontend/src/hooks/useDirectoryPreferences.ts:27 — /api/projects/${projectId}/directory/preferences — hook — fetch(`/api/projects/${projectId}/directory/preferences`),
frontend/src/lib/projects.ts:4 — /api/projects — lib — const res = await fetch("/api/projects");
frontend/src/lib/projects.ts:19 — /api/projects/${id} — lib — const res = await fetch(`/api/projects/${id}`);
```

---

## Raw external fetch (Rule 16 violations)

API routes must use `fetchWithGuardrails` for external HTTP. Each raw
`fetch()` below has no timeout, no retry, no request-id propagation, no
structured error output.

`file:line — url — line content`

```
frontend/src/lib/documents/email.ts:44 — https://api.resend.com/emails — const response = await fetch("https://api.resend.com/emails", {
```

---

## How to run

```bash
node scripts/audits/audit-type-escapes.mjs          # writes to stdout; summary to stderr
node scripts/audits/audit-untyped-supabase-clients.mjs
node scripts/audits/audit-raw-internal-fetch.mjs
node scripts/audits/audit-raw-external-fetch.mjs
```

Each script is pure Node (ESM, no dependencies), exits 0 even when
violations are found, and prints one violation per line in a tab-separated
format suitable for grep/awk.

## Recommended remediation order

1. **Type the Supabase clients first** (160 sites). Every API route and
   client helper should call `createClient<Database>()`. Fix the factory
   helpers in `lib/supabase/*.ts` so callers get the generic automatically,
   then delete the `as any` casts that exist only to silence untyped
   queries — that alone should retire a large fraction of the 148 type
   escapes inside `app/api/`.
2. **Migrate the 336 raw internal `fetch()` calls to `apiFetch`.** These
   are pure mechanical refactors but they unlock real error messages
   everywhere. Start with hooks (52) and components (126) — they are
   imported into many pages, so each fix compounds.
3. **Replace the remaining type escapes** (`as any` / `: any`) once the
   Supabase generic is in place; most will have become trivially typeable.
4. **Fix the one external fetch** (`lib/documents/email.ts` → Resend) with
   `fetchWithGuardrails` to enforce timeout + request-id.
