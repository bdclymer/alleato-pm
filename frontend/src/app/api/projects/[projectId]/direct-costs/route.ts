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

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from 'next/server';
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

export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/direct-costs#GET",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/direct-costs#GET", message: "Authentication required." });
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
    },
);

// =============================================================================
// POST - Create New Direct Cost
// =============================================================================

export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/direct-costs#POST",
  async ({ request, params }) => {
  
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
    },
);
