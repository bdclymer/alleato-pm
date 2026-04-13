/**
 * ============================================================================
 * CHANGE EVENTS API ROUTE (Collection-Level)
 * ============================================================================
 *
 * RESTful API endpoints for Change Events CRUD operations
 *
 * GET /api/projects/[id]/change-events - List change events with filters/pagination
 * POST /api/projects/[id]/change-events - Create new change event
 *
 * Schema Reference: change_events table
 * - id: uuid (PK)
 * - project_id: number (FK to projects)
 * - number: string (auto-generated, format: "001", "002", etc.)
 * - title: string
 * - type: string (Owner Change, Design Change, Allowance, etc.)
 * - status: string (Open, Closed, Void)
 * - scope: string (TBD, In Scope, Out of Scope, Allowance)
 * - origin: string (Internal, RFI, Field)
 * - reason: string
 * - description: string
 * - expecting_revenue: boolean
 * - line_item_revenue_source: string
 * - prime_contract_id: number (FK to prime_contracts)
 * - created_by: uuid (FK to users)
 * - updated_by: uuid (FK to users)
 * - deleted_at: timestamp
 *
 * Relations:
 * - change_event_line_items (one-to-many)
 * - change_event_attachments (one-to-many)
 * - change_event_history (one-to-many)
 */

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, createClientWithToken } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createChangeEventSchema, changeEventQuerySchema } from './validation'
import { ZodError } from 'zod'
import type { Database } from '@/types/database.types'
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

/**
 * Helper to get the appropriate Supabase client based on auth method
 * If Bearer token in Authorization header, use token-based client
 * Otherwise, use cookie-based client
 */
async function getSupabaseClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    return { client: createClientWithToken(token), token }
  }
  return { client: await createClient(), token: null }
}

interface RouteParams {
  params: Promise<{ projectId: string }>
}

type ChangeEvent = Database['public']['Tables']['change_events']['Row']

interface ChangeEventWithTotals extends ChangeEvent {
  rom: string
  total: string
  cost_rom: string
  lineItemsCount: number
  prime_pco: string | null
  prime_pco_title: string | null
  rfq_title: string | null
  commitment: string | null
  commitment_title: string | null
}

interface VerticalMarkupRow {
  percentage: number | null
  calculation_order: number | null
  compound: boolean | null
}

function computeMarkupAdditions(
  _baseCost: number,
  baseRevenue: number,
  markups: VerticalMarkupRow[]
): { cost: number; revenue: number } {
  if (markups.length === 0) {
    return { cost: 0, revenue: 0 }
  }

  const sortedMarkups = [...markups].sort(
    (a, b) => (a.calculation_order ?? 0) - (b.calculation_order ?? 0)
  )

  let runningRevenueBase = baseRevenue
  let totalRevenueMarkup = 0

  for (const markup of sortedMarkups) {
    const percentage = Number(markup.percentage || 0)
    if (!Number.isFinite(percentage) || percentage <= 0) {
      continue
    }

    const rate = percentage / 100
    // Markups (contractor fee, insurance) apply to Revenue ROM only
    const revenueMarkup = runningRevenueBase * rate
    totalRevenueMarkup += revenueMarkup

    if (markup.compound) {
      runningRevenueBase += revenueMarkup
    }
  }

  return {
    cost: 0,
    revenue: totalRevenueMarkup,
  }
}

/**
 * Generate next change event number for project
 * Format: "001", "002", "003", etc.
 */
async function generateChangeEventNumber(
  supabase: any,
  projectId: number
): Promise<string> {
  // Get ALL change event numbers (including soft-deleted) to avoid unique constraint
  // violations — the unique constraint covers all rows, not just active ones.
  const { data: existing } = await supabase
    .from('change_events')
    .select('number')
    .eq('project_id', projectId)

  let maxNumber = 0
  for (const row of existing ?? []) {
    if (!row?.number) continue
    // Use the trailing integer to handle "CE-001", "001", "9", etc.
    const match = String(row.number).match(/(\d+)\s*$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (Number.isFinite(n) && n > maxNumber) maxNumber = n
    }
  }

  const nextNumber = maxNumber + 1

  // Format as 3-digit padded number
  return nextNumber.toString().padStart(3, '0')
}

/**
 * GET /api/projects/[id]/change-events
 * Returns paginated list of change events for a project
 *
 * Query Parameters:
 * - page (default: 1): Page number
 * - limit (default: 25): Items per page
 * - status: Filter by status (Open, Closed, Void)
 * - type: Filter by type (Owner Change, Design Change, etc.)
 * - scope: Filter by scope (TBD, In Scope, Out of Scope, Allowance)
 * - search: Search number/title/description
 * - sort: Sort field (createdAt, updatedAt, number, title)
 * - order: Sort order (asc, desc)
 * - includeDeleted: Include soft-deleted records (default: false)
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/change-events#GET",
  async ({ request, params }) => {
  
    const { projectId } = await params
    const { client: supabase } = await getSupabaseClient(request)
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryParams = changeEventQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    )

    const projectIdNum = parseInt(projectId, 10)

    // ── Tab pre-queries (lightweight) ──────────────────────────────────────
    // When a tab filter is requested, we need to resolve which CE IDs belong
    // to that tab so we can apply an IN filter on the main paginated query.
    // We also compute tab counts for the response meta in one pass.
    let tabFilterIds: string[] | null = null
    let tabSummary = { lineItems: 0, noLineItems: 0, rfqs: 0, recycleBin: 0 }

    if (queryParams.tab && queryParams.tab !== 'all') {
      // 1. Fetch all CE IDs for the project (active and deleted)
      const { data: projectCEs } = await (supabase as any)
        .from('change_events')
        .select('id, deleted_at')
        .eq('project_id', projectIdNum)

      const activeCEIds: string[] = (projectCEs || [])
        .filter((r: { id: string; deleted_at: string | null }) => !r.deleted_at)
        .map((r: { id: string }) => r.id)

      tabSummary.recycleBin = (projectCEs || []).filter(
        (r: { deleted_at: string | null }) => r.deleted_at
      ).length

      // 2. CE IDs that have at least one line item
      const idsWithItemsSet = new Set<string>()
      if (activeCEIds.length > 0) {
        const { data: ceWithItems } = await (supabase as any)
          .from('change_event_line_items')
          .select('change_event_id')
          .in('change_event_id', activeCEIds)

        for (const row of ceWithItems || []) {
          idsWithItemsSet.add(String(row.change_event_id))
        }
      }

      tabSummary.lineItems = idsWithItemsSet.size
      tabSummary.noLineItems = activeCEIds.length - idsWithItemsSet.size

      // 3. CE IDs that have an RFQ
      const idsWithRfqSet = new Set<string>()
      if (activeCEIds.length > 0) {
        const { data: ceWithRfqs } = await (supabase as any)
          .from('change_event_rfqs')
          .select('change_event_id')
          .in('change_event_id', activeCEIds)

        for (const row of ceWithRfqs || []) {
          idsWithRfqSet.add(String(row.change_event_id))
        }
      }

      tabSummary.rfqs = idsWithRfqSet.size

      // 4. Resolve tab filter IDs
      if (queryParams.tab === 'line_items') {
        tabFilterIds = activeCEIds.filter((id) => idsWithItemsSet.has(id))
      } else if (queryParams.tab === 'no_line_items') {
        tabFilterIds = activeCEIds.filter((id) => !idsWithItemsSet.has(id))
      } else if (queryParams.tab === 'rfqs') {
        tabFilterIds = activeCEIds.filter((id) => idsWithRfqSet.has(id))
      }
      // recycle_bin is handled via includeDeleted + deleted_at filter below
    }

    // ── Build base query ────────────────────────────────────────────────────
    let query = (supabase as any)
      .from('change_events')
      .select(
        `
        *,
        change_event_line_items(count)
      `,
        { count: 'exact' }
      )
      .eq('project_id', projectIdNum)

    // Apply filters
    if (queryParams.tab === 'recycle_bin') {
      // Recycle bin shows only deleted records
      query = query.not('deleted_at', 'is', null)
    } else if (!queryParams.includeDeleted) {
      query = query.is('deleted_at', null)
    }

    // Apply tab ID filter for line_items / no_line_items / rfqs
    if (tabFilterIds !== null) {
      if (tabFilterIds.length === 0) {
        // No records match — short-circuit
        return NextResponse.json({
          data: [],
          meta: { page: queryParams.page, limit: queryParams.limit, total: 0, totalPages: 0, tabSummary },
        })
      }
      query = query.in('id', tabFilterIds)
    }

    if (queryParams.status) {
      query = query.eq('status', queryParams.status)
    }

    if (queryParams.type) {
      query = query.eq('type', queryParams.type)
    }

    if (queryParams.scope) {
      query = query.eq('scope', queryParams.scope)
    }

    if (queryParams.search) {
      query = query.or(
        `number.ilike.%${queryParams.search}%,title.ilike.%${queryParams.search}%,description.ilike.%${queryParams.search}%`
      )
    }

    // Apply sorting
    const sortColumn =
      queryParams.sort === 'number'
        ? 'number'
        : queryParams.sort === 'createdAt'
          ? 'created_at'
          : queryParams.sort === 'updatedAt'
            ? 'updated_at'
            : queryParams.sort

    query = query.order(sortColumn, { ascending: queryParams.order === 'asc' })

    // Apply pagination
    const from = (queryParams.page - 1) * queryParams.limit
    const to = from + queryParams.limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      return apiErrorResponse(error);
    }

    const events = data || []
    const eventIds = events.map((event: ChangeEvent) => event.id)

    const { data: projectMarkups } = await (supabase as any)
      .from('vertical_markup')
      .select('percentage, calculation_order, compound')
      .eq('project_id', parseInt(projectId, 10))

    // Batch fetch line-item level parity data for all rows on page.
    const { data: allLineItems } = eventIds.length
      ? await (supabase as any)
          .from('change_event_line_items')
          .select('change_event_id, revenue_rom, cost_rom, non_committed_cost, contract_id')
          .in('change_event_id', eventIds)
      : { data: [] as any[] }

    const lineItemMap = new Map<
      string,
      {
        rom: number
        total: number
        costRom: number
        count: number
        contractId: string | null
      }
    >()

    for (const item of allLineItems || []) {
      const key = String(item.change_event_id)
      const existing = lineItemMap.get(key) || {
        rom: 0,
        total: 0,
        costRom: 0,
        count: 0,
        contractId: null,
      }
      existing.rom += item.revenue_rom || 0
      existing.costRom += item.cost_rom || 0
      existing.total += (item.cost_rom || 0) + (item.non_committed_cost || 0)
      existing.count += 1
      if (!existing.contractId && item.contract_id) {
        existing.contractId = item.contract_id
      }
      lineItemMap.set(key, existing)
    }

    const contractIds = Array.from(
      new Set(
        Array.from(lineItemMap.values())
          .map((entry) => entry.contractId)
          .filter((id): id is string => id !== null)
      )
    )

    const { data: contracts } = contractIds.length
      ? await (supabase as any)
          .from('prime_contracts')
          .select('id, contract_number, title')
          .in('id', contractIds)
      : { data: [] as any[] }

    const contractMap = new Map<
      string,
      { contractNumber: string | null; title: string | null }
    >()
    for (const contract of contracts || []) {
      contractMap.set(contract.id, {
        contractNumber: contract.contract_number || null,
        title: contract.title || null,
      })
    }

    const { data: rfqs } = eventIds.length
      ? await (supabase as any)
          .from('change_event_rfqs')
          .select('change_event_id, title, created_at')
          .in('change_event_id', eventIds)
          .order('created_at', { ascending: false })
      : { data: [] as any[] }

    const rfqMap = new Map<string, string>()
    for (const rfq of rfqs || []) {
      const key = String(rfq.change_event_id)
      if (!rfqMap.has(key)) {
        rfqMap.set(key, rfq.title || '')
      }
    }

    // Batch-fetch PCO links from change_event_related_items for all CEs on
    // the current page. We look for `related_type = 'potential_change_order'`.
    const { data: pcoLinks } = eventIds.length
      ? await (supabase as any)
          .from('change_event_related_items')
          .select('change_event_id, related_number, related_title')
          .in('change_event_id', eventIds)
          .eq('related_type', 'potential_change_order')
      : { data: [] as any[] }

    const pcoMap = new Map<string, { number: string | null; title: string | null }>()
    for (const link of pcoLinks || []) {
      const key = String(link.change_event_id)
      // Keep the first (most recent insert) if a CE is linked to multiple PCOs
      if (!pcoMap.has(key)) {
        pcoMap.set(key, {
          number: link.related_number || null,
          title: link.related_title || null,
        })
      }
    }

    const changeEventsWithTotals: ChangeEventWithTotals[] = events.map(
      (event: ChangeEvent & { change_event_line_items?: { count: number }[] }) => {
        const lineItemAgg = lineItemMap.get(String(event.id))
        const contractInfo =
          lineItemAgg?.contractId ? contractMap.get(lineItemAgg.contractId) : undefined

        const baseRevenueRom = lineItemAgg?.rom || 0
        const baseCostRom = lineItemAgg?.costRom || 0
        const baseNonCommitted = lineItemAgg ? lineItemAgg.total - lineItemAgg.costRom : 0
        const applyMarkup = event.expecting_revenue !== false
        const markupAdditions = computeMarkupAdditions(
          baseCostRom,
          baseRevenueRom,
          applyMarkup ? ((projectMarkups || []) as VerticalMarkupRow[]) : []
        )
        const revenueRomWithMarkup = baseRevenueRom + markupAdditions.revenue
        const costRomWithMarkup = baseCostRom + markupAdditions.cost
        const totalWithMarkup = costRomWithMarkup + baseNonCommitted

        return {
          ...event,
          rom: revenueRomWithMarkup.toFixed(2),
          total: totalWithMarkup.toFixed(2),
          cost_rom: costRomWithMarkup.toFixed(2),
          lineItemsCount: lineItemAgg?.count ?? event.change_event_line_items?.[0]?.count ?? 0,
          prime_pco: pcoMap.get(String(event.id))?.number ?? null,
          prime_pco_title: pcoMap.get(String(event.id))?.title ?? null,
          rfq_title: rfqMap.get(String(event.id)) || null,
          commitment: contractInfo?.contractNumber || null,
          commitment_title: contractInfo?.title || null,
        }
      }
    )

    // Format response with pagination
    const totalPages = count ? Math.ceil(count / queryParams.limit) : 0

    const response = {
      data: changeEventsWithTotals,
      meta: {
        page: queryParams.page,
        limit: queryParams.limit,
        total: count || 0,
        totalPages,
        ...(queryParams.tab ? { tabSummary } : {}),
      },
    }

    return NextResponse.json(response)
    },
);

/**
 * POST /api/projects/[id]/change-events
 * Creates a new change event
 *
 * Request Body:
 * - title (required): string
 * - type (required): string (Owner Change, Design Change, etc.)
 * - scope (required): string (TBD, In Scope, Out of Scope, Allowance)
 * - expectingRevenue (default: true): boolean
 * - reason: string
 * - origin: string (Internal, RFI, Field)
 * - lineItemRevenueSource: string
 * - primeContractId: number
 * - description: string
 *
 * Updated: 2026-01-10 - Fixed authentication for Playwright tests
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/change-events#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "change_orders", "write");
    if (guard.denied) return guard.response;

    const { client: supabase, token } = await getSupabaseClient(request)
    const body = await request.json()

    // Get current user - pass token directly if available
    const { data: { user }, error: authError } = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      )
    }

    // Validate request body
    const {
      title,
      type,
      status,
      reason,
      scope,
      origin,
      expectingRevenue,
      lineItemRevenueSource,
      primeContractId,
      description,
    } = createChangeEventSchema.parse(body)

    const originId = typeof body.originId === "string" ? body.originId : null;

    // Generate change event number
    const eventNumber = await generateChangeEventNumber(
      supabase,
      parseInt(projectId, 10)
    )

    // Look up person via users_auth bridge (for foreign key constraint)
    const { data: authLink } = await (supabase as any)
      .from('users_auth')
      .select('person_id')
      .eq('auth_user_id', user.id)
      .single()
    const userExists = authLink ? { id: authLink.person_id } : null

    // Map the validated data to database schema
    const dbData: Database['public']['Tables']['change_events']['Insert'] = {
      project_id: parseInt(projectId, 10),
      number: eventNumber,
      title,
      type,
      reason: reason || null,
      scope,
      status: status || "Open",
      origin: origin || 'Internal',
      origin_id: originId,
      expecting_revenue: expectingRevenue,
      line_item_revenue_source: lineItemRevenueSource || null,
      prime_contract_id: primeContractId != null ? String(primeContractId) : null,
      description: description || null,
      created_at: new Date().toISOString(),
      // Only set created_by if user exists in profiles table
      created_by: userExists ? user.id : null,
    }

    // Create the change event
    const { data, error } = await (supabase as any)
      .from('change_events')
      .insert(dbData)
      .select()
      .single()

    if (error) {
      return apiErrorResponse(error);
    }

    // Create audit log entry
    if (userExists) {
      await (supabase as any).from('change_event_history').insert({
        change_event_id: data.id,
        field_name: 'status',
        old_value: null,
        new_value: status || "Open",
        changed_by: user.id,
        change_type: 'CREATE',
      })
    }

    // Format response
    const response = {
      id: data.id,
      number: data.number,
      title: data.title,
      type: data.type,
      reason: data.reason,
      scope: data.scope,
      status: data.status,
      origin: data.origin,
      expectingRevenue: data.expecting_revenue,
      lineItemRevenueSource: data.line_item_revenue_source,
      primeContractId: data.prime_contract_id,
      description: data.description,
      createdAt: data.created_at,
      createdBy: userExists
        ? {
            id: user.id,
            email: user.email,
          }
        : null,
      _links: {
        self: `/api/projects/${projectId}/change-events/${data.id}`,
        lineItems: `/api/projects/${projectId}/change-events/${data.id}/line-items`,
        attachments: `/api/projects/${projectId}/change-events/${data.id}/attachments`,
      },
    }

    return NextResponse.json(response, { status: 201 })
    },
);
