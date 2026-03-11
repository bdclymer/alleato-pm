/**
 * =============================================================================
 * ESTIMATE LINE ITEMS API ENDPOINTS
 * =============================================================================
 *
 * API endpoints for estimate line item collection operations:
 * - POST: Add a single line item or bulk-add multiple line items
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EstimateLineItemSchema } from '@/lib/schemas/estimates';
import { EstimateService } from '@/lib/services/estimate-service';
import { z } from 'zod';

// =============================================================================
// POST - Add Line Item(s) to Estimate
// =============================================================================

export async function POST(
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
    const service = new EstimateService(supabase);

    // Support both single item and array (bulk add)
    if (Array.isArray(body)) {
      const validation = z.array(EstimateLineItemSchema).safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid line item data',
            details: validation.error.format(),
          },
          { status: 400 }
        );
      }

      const lineItems = await service.bulkAddLineItems(
        estimateIdNum,
        validation.data
      );

      return NextResponse.json(lineItems, { status: 201 });
    }

    // Single item
    const validation = EstimateLineItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid line item data',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const lineItem = await service.addLineItem(
      estimateIdNum,
      validation.data
    );

    return NextResponse.json(lineItem, { status: 201 });
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
          { error: 'Insufficient permissions to add line items' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to add line item(s)' },
      { status: 500 }
    );
  }
}
