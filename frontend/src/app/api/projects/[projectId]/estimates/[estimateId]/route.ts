/**
 * =============================================================================
 * INDIVIDUAL ESTIMATE API ENDPOINTS
 * =============================================================================
 *
 * API endpoints for individual estimate operations:
 * - GET: Fetch single estimate with line items, alternates, and allowances
 * - PUT: Update existing estimate
 * - DELETE: Soft delete estimate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EstimateUpdateSchema } from '@/lib/schemas/estimates';
import { EstimateService } from '@/lib/services/estimate-service';

// =============================================================================
// GET - Fetch Single Estimate
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; estimateId: string }> }
) {
  try {
    const { estimateId } = await params;
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

    const estimateIdNum = parseInt(estimateId, 10);
    if (isNaN(estimateIdNum)) {
      return NextResponse.json(
        { error: 'Invalid estimate ID' },
        { status: 400 }
      );
    }

    const service = new EstimateService(supabase);
    const estimate = await service.getById(estimateIdNum);

    if (!estimate) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(estimate);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch estimate' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update Estimate
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; estimateId: string }> }
) {
  try {
    const { estimateId } = await params;
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

    const estimateIdNum = parseInt(estimateId, 10);
    if (isNaN(estimateIdNum)) {
      return NextResponse.json(
        { error: 'Invalid estimate ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Merge ID into body for validation
    const dataWithId = { ...body, estimate_id: estimateIdNum };

    // Validate request data
    const validation = EstimateUpdateSchema.safeParse(dataWithId);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const service = new EstimateService(supabase);
    const updatedEstimate = await service.update(estimateIdNum, validation.data);

    if (!updatedEstimate) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedEstimate);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Estimate not found' },
          { status: 404 }
        );
      }

      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to update estimate' },
          { status: 403 }
        );
      }

      if (error.message.includes('foreign key')) {
        return NextResponse.json(
          { error: 'Invalid reference in estimate data' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update estimate' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Soft Delete Estimate
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; estimateId: string }> }
) {
  try {
    const { estimateId } = await params;
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

    const estimateIdNum = parseInt(estimateId, 10);
    if (isNaN(estimateIdNum)) {
      return NextResponse.json(
        { error: 'Invalid estimate ID' },
        { status: 400 }
      );
    }

    const service = new EstimateService(supabase);
    const success = await service.delete(estimateIdNum);

    if (!success) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Estimate not found' },
          { status: 404 }
        );
      }

      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to delete estimate' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete estimate' },
      { status: 500 }
    );
  }
}
