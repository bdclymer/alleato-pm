/**
 * =============================================================================
 * ESTIMATES API ENDPOINTS
 * =============================================================================
 *
 * RESTful API endpoints for Estimates CRUD operations
 * Follows the patterns established in the codebase and supports:
 * - Full CRUD operations
 * - Filtering, search, pagination, and sorting
 * - Type-safe request/response handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  EstimateCreateSchema,
  EstimateListParamsSchema,
} from '@/lib/schemas/estimates';
import { EstimateService } from '@/lib/services/estimate-service';

// =============================================================================
// GET - Fetch Estimates (with filtering, pagination, sorting)
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
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Validate and parse query parameters
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = EstimateListParamsSchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const service = new EstimateService(supabase);
    const result = await service.list(parseInt(projectId, 10), validation.data);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch estimates' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create New Estimate
// =============================================================================

export async function POST(
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
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request data
    const validation = EstimateCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid estimate data',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const service = new EstimateService(supabase);
    const estimate = await service.create(parseInt(projectId, 10), validation.data, user.id);

    return NextResponse.json(estimate, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('foreign key')) {
        return NextResponse.json(
          { error: 'Invalid reference in estimate data' },
          { status: 400 }
        );
      }

      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to create estimate' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create estimate' },
      { status: 500 }
    );
  }
}
