/**
 * =============================================================================
 * DIRECT COSTS API ENDPOINTS
 * =============================================================================
 *
 * RESTful API endpoints for Direct Costs CRUD operations
 * Follows the patterns established in the codebase and supports:
 * - Full CRUD operations
 * - Advanced filtering and search
 * - Pagination and sorting
 * - Summary views and aggregations
 * - Type-safe request/response handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  DirectCostCreateSchema,
  DirectCostListParamsSchema,
} from '@/lib/schemas/direct-costs';
import { DirectCostService } from '@/lib/services/direct-cost-service';
import { requirePermission } from "@/lib/permissions-guard";

// =============================================================================
// GET - Fetch Direct Costs (with filtering, pagination, sorting)
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Validate and parse query parameters
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = DirectCostListParamsSchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const listParams = validation.data;
    const service = new DirectCostService(supabase);

    // Handle different view modes
    if (listParams.view === 'summary-by-cost-code') {
      const summary = await service.getSummaryByCostCode(projectId, listParams);
      return NextResponse.json(summary);
    }

    // Check if summary data is requested
    const includeSummary = searchParams.get('include_summary') === 'true';

    // Fetch main data
    const result = await service.list(projectId, listParams);

    // Optionally include summary data
    if (includeSummary) {
      const summary = await service.getSummary(projectId);
      return NextResponse.json({
        ...result,
        summary,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch direct costs' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create New Direct Cost
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const guard = await requirePermission(projectIdNum, "budget", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    const body = await request.json();

    // Validate request data
    const validation = DirectCostCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid direct cost data',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const service = new DirectCostService(supabase);

    // Create the direct cost with line items
    const directCost = await service.create(projectId, validation.data);

    return NextResponse.json(directCost, { status: 201 });
  } catch (error) {
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('foreign key')) {
        return NextResponse.json(
          { error: 'Invalid reference to budget code, vendor, or employee' },
          { status: 400 }
        );
      }

      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to create direct cost' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create direct cost' },
      { status: 500 }
    );
  }
}
