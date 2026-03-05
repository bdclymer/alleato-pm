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

import { createClient, createClientWithToken } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createChangeEventSchema, changeEventQuerySchema } from './validation'
import { ZodError } from 'zod'
import type { Database } from '@/types/database.types'
import type { PaginatedResponse } from '@/app/api/types'

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
  lineItemsCount: number
}

/**
 * Generate next change event number for project
 * Format: "001", "002", "003", etc.
 */
async function generateChangeEventNumber(
  supabase: any,
  projectId: number
): Promise<string> {
  // Get the highest number from existing change events
  const { data: lastEvent } = await supabase
    .from('change_events')
    .select('number')
    .eq('project_id', projectId)
    .order('number', { ascending: false })
    .limit(1)
    .single()

  let nextNumber = 1

  if (lastEvent?.number) {
    // Extract numeric part from format like "CE-001" or "001"
    const match = lastEvent.number.match(/\d+/)
    if (match) {
      nextNumber = parseInt(match[0], 10) + 1
    }
  }

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
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params
    const { client: supabase } = await getSupabaseClient(request)
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryParams = changeEventQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    )

    // Build base query
    let query = (supabase as any)
      .from('change_events')
      .select(
        `
        *,
        change_event_line_items(count)
      `,
        { count: 'exact' }
      )
      .eq('project_id', parseInt(projectId, 10))

    // Apply filters
    if (!queryParams.includeDeleted) {
      query = query.is('deleted_at', null)
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
      return NextResponse.json(
        { error: 'Failed to fetch change events', details: error.message },
        { status: 400 }
      )
    }

    // Calculate totals for each change event
    const changeEventsWithTotals: ChangeEventWithTotals[] = await Promise.all(
      (data || []).map(async (event: ChangeEvent & { change_event_line_items?: { count: number }[] }) => {
        // Get line items to calculate totals
        const { data: lineItems } = await (supabase as any)
          .from('change_event_line_items')
          .select('revenue_rom, cost_rom, non_committed_cost')
          .eq('change_event_id', event.id)

        const rom = (lineItems || []).reduce(
          (sum: number, item: { revenue_rom: number | null; cost_rom: number | null; non_committed_cost: number | null }) => sum + (item.revenue_rom || 0),
          0
        )
        const total = (lineItems || []).reduce(
          (sum: number, item: { revenue_rom: number | null; cost_rom: number | null; non_committed_cost: number | null }) => sum + (item.cost_rom || 0) + (item.non_committed_cost || 0),
          0
        )

        return {
          ...event,
          rom: rom.toFixed(2),
          total: total.toFixed(2),
          lineItemsCount: event.change_event_line_items?.[0]?.count || 0,
        }
      })
    )

    // Format response with pagination
    const totalPages = count ? Math.ceil(count / queryParams.limit) : 0

    const response: PaginatedResponse<ChangeEventWithTotals> = {
      data: changeEventsWithTotals,
      meta: {
        page: queryParams.page,
        limit: queryParams.limit,
        total: count || 0,
        totalPages,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params
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
      expecting_revenue: expectingRevenue,
      line_item_revenue_source: lineItemRevenueSource || null,
      prime_contract_id: primeContractId || null,
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
      return NextResponse.json(
        { error: 'Failed to create change event', details: error.message },
        { status: 400 }
      )
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
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
