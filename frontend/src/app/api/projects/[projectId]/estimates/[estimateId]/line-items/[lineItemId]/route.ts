/**
 * =============================================================================
 * INDIVIDUAL ESTIMATE LINE ITEM API ENDPOINTS
 * =============================================================================
 *
 * API endpoints for individual estimate line item operations:
 * - PUT: Update a line item
 * - DELETE: Delete a line item
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EstimateLineItemSchema } from '@/lib/schemas/estimates';
import { EstimateService } from '@/lib/services/estimate-service';

// =============================================================================
// PUT - Update Line Item
// =============================================================================

export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
      estimateId: string;
      lineItemId: string;
    }>;
  }
) {
  try {
    const { lineItemId } = await params;
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

    const lineItemIdNum = parseInt(lineItemId, 10);

    if (isNaN(lineItemIdNum)) {
      return NextResponse.json(
        { error: 'Invalid line item ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Merge the line_item_id into the body for validation
    const dataWithId = { ...body, line_item_id: lineItemIdNum };

    const validation = EstimateLineItemSchema.safeParse(dataWithId);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid line item data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const service = new EstimateService(supabase);
    const updatedLineItem = await service.updateLineItem(
      lineItemIdNum,
      validation.data
    );

    if (!updatedLineItem) {
      return NextResponse.json(
        { error: 'Line item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedLineItem);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Line item not found' },
          { status: 404 }
        );
      }

      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to update line item' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update line item' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete Line Item
// =============================================================================

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
      estimateId: string;
      lineItemId: string;
    }>;
  }
) {
  try {
    const { lineItemId } = await params;
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

    const lineItemIdNum = parseInt(lineItemId, 10);

    if (isNaN(lineItemIdNum)) {
      return NextResponse.json(
        { error: 'Invalid line item ID' },
        { status: 400 }
      );
    }

    const service = new EstimateService(supabase);
    const success = await service.deleteLineItem(lineItemIdNum);

    if (!success) {
      return NextResponse.json(
        { error: 'Line item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Line item not found' },
          { status: 404 }
        );
      }

      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to delete line item' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete line item' },
      { status: 500 }
    );
  }
}
