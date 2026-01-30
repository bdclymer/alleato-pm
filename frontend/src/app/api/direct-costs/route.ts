/**
 * ============================================================================
 * DIRECT COSTS API ROUTE (Collection-Level)
 * ============================================================================
 *
 * RESTful API endpoints for Direct Costs CRUD operations
 *
 * GET /api/direct-costs - List direct costs with filters/pagination
 * POST /api/direct-costs - Create new direct cost
 *
 * Schema Reference: direct_costs table
 * - id: uuid (PK)
 * - project_id: number (FK to projects)
 * - vendor_id: uuid (FK to vendors)
 * - employee_id: number (FK to employees)
 * - cost_type: string (material, labor, equipment, etc.)
 * - status: string (draft, approved, paid)
 * - description: string
 * - invoice_number: string
 * - date: string (transaction date)
 * - received_date: string
 * - paid_date: string
 * - total_amount: number
 * - terms: string
 * - created_by_user_id: uuid
 * - updated_by_user_id: uuid
 * - is_deleted: boolean
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { PaginatedResponse } from '@/app/api/types'
import { apiErrorResponse } from '@/lib/api-error'

interface DirectCost {
  id: string
  project_id: number
  vendor_id?: string
  employee_id?: number
  cost_type: string
  status: string
  description?: string
  invoice_number?: string
  date: string
  received_date?: string
  paid_date?: string
  total_amount: number
  terms?: string
  created_at: string
  updated_at: string
  created_by_user_id: string
  updated_by_user_id: string
  is_deleted?: boolean
}

interface DirectCostWithRelations extends DirectCost {
  vendor_name?: string
  employee_name?: string
  project_name?: string
}

/**
 * GET /api/direct-costs
 * List direct costs with filtering, pagination, and search
 *
 * Query Parameters:
 * - projectId (required): Filter by project
 * - page (default: 1): Page number
 * - limit (default: 100): Items per page
 * - costType: Filter by cost type (material, labor, equipment, etc.)
 * - status: Filter by status (draft, approved, paid)
 * - search: Search description/invoice number
 * - vendorId: Filter by vendor
 * - employeeId: Filter by employee
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const projectId = searchParams.get('projectId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const costType = searchParams.get('costType')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const vendorId = searchParams.get('vendorId')
    const employeeId = searchParams.get('employeeId')

    // Validate required parameters
    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: projectId' },
        { status: 400 }
      )
    }

    // Build query with relations
    // Use direct_costs_with_details view for optimized queries with vendor/employee names
    let query = supabase
      .from('direct_costs_with_details')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('date', { ascending: false })

    // Apply filters
    if (costType) {
      query = query.eq('cost_type', costType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (vendorId) {
      query = query.eq('vendor_id', vendorId)
    }

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    // Apply search
    if (search) {
      query = query.or(
        `description.ilike.%${search}%,invoice_number.ilike.%${search}%`
      )
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      return apiErrorResponse(error)
    }

    // Map the data to consistent format
    const mappedData: DirectCostWithRelations[] = (data || []).map((row) => ({
      id: row.id || '',
      project_id: row.project_id || 0,
      vendor_id: row.vendor_id || undefined,
      employee_id: row.employee_id || undefined,
      cost_type: row.cost_type || 'other',
      status: row.status || 'draft',
      description: row.description || undefined,
      invoice_number: row.invoice_number || undefined,
      date: row.date || '',
      received_date: row.received_date || undefined,
      paid_date: row.paid_date || undefined,
      total_amount: Number(row.total_amount) || 0,
      terms: row.terms || undefined,
      created_at: row.created_at || '',
      updated_at: row.updated_at || '',
      created_by_user_id: row.created_by_user_id || '',
      updated_by_user_id: row.updated_by_user_id || '',
      is_deleted: row.is_deleted || false,
      // Include related data from view
      vendor_name: row.vendor_name || undefined,
      employee_name: row.employee_name || undefined,
      project_name: row.project_name || undefined,
    }))

    const response: PaginatedResponse<DirectCostWithRelations> = {
      data: mappedData,
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    return apiErrorResponse(error)
  }
}

/**
 * POST /api/direct-costs
 * Create a new direct cost
 *
 * Request Body:
 * - project_id (required): number
 * - cost_type (required): string
 * - date (required): string (ISO date)
 * - total_amount (required): number
 * - vendor_id: string (uuid)
 * - employee_id: number
 * - description: string
 * - invoice_number: string
 * - received_date: string (ISO date)
 * - paid_date: string (ISO date)
 * - status: string (default: 'draft')
 * - terms: string
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate required fields
    if (
      !body.project_id ||
      !body.cost_type ||
      !body.date ||
      body.total_amount === undefined
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: project_id, cost_type, date, total_amount',
        },
        { status: 400 }
      )
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', body.project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Verify vendor if provided
    if (body.vendor_id) {
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('id', body.vendor_id)
        .single()

      if (vendorError || !vendor) {
        return NextResponse.json(
          { error: 'Vendor not found' },
          { status: 404 }
        )
      }
    }

    // Verify employee if provided
    if (body.employee_id) {
      const { data: employee, error: employeeError } = await supabase
        .from('people')
        .select('id')
        .eq('id', body.employee_id)
        .single()

      if (employeeError || !employee) {
        return NextResponse.json(
          { error: 'Employee not found' },
          { status: 404 }
        )
      }
    }

    // Prepare direct cost data
    const directCostData = {
      project_id: body.project_id,
      vendor_id: body.vendor_id || null,
      employee_id: body.employee_id || null,
      cost_type: body.cost_type,
      date: body.date,
      total_amount: Number(body.total_amount),
      description: body.description || null,
      invoice_number: body.invoice_number || null,
      received_date: body.received_date || null,
      paid_date: body.paid_date || null,
      status: body.status || 'draft',
      terms: body.terms || null,
      created_by_user_id: user.id,
      updated_by_user_id: user.id,
      is_deleted: false,
    }

    // Insert direct cost
    const { data, error } = await supabase
      .from('direct_costs')
      .insert(directCostData)
      .select(
        `
        *,
        vendor:vendors!vendor_id(id, name),
        employee:people!employee_id(id, first_name, last_name)
      `
      )
      .single()

    if (error) {
      return apiErrorResponse(error)
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
