import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createLineItemSchema, updateLineItemSchema } from '../../validation';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{
    projectId: string;
    changeEventId: string;
  }>;
}

/**
 * GET /api/projects/[id]/change-events/[changeEventId]/line-items
 * Returns all line items for a change event
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId, changeEventId } = await params;
    const supabase = await createClient();

    // Verify change event exists
    const { data: changeEvent, error: eventError } = await supabase
      .from('change_events')
      .select('id')
      .eq('project_id', parseInt(projectId, 10))
      .eq('id', changeEventId)
      .is('deleted_at', null)
      .single();

    if (eventError || !changeEvent) {
      return NextResponse.json(
        { error: 'Change event not found' },
        { status: 404 }
      );
    }

    // Get line items with budget_line details
    const { data: lineItems, error } = await supabase
      .from('change_event_line_items')
      .select(`
        *,
        budget_line:budget_lines!budget_code_id(
          id,
          description,
          cost_code:cost_codes!cost_code_id(
            id,
            title,
            division_id,
            division_title
          )
        ),
        vendor:companies!vendor_id(
          id,
          name
        )
      `)
      .eq('change_event_id', changeEventId)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch line items', details: error.message },
        { status: 400 }
      );
    }

    // Format response
    const formattedItems = (lineItems || []).map(item => {
      const quantity = item.quantity || 0;
      const unitCost = item.unit_cost || 0;
      const extendedAmount = quantity * unitCost;

      return {
        id: item.id,
        changeEventId: item.change_event_id,
        budgetCodeId: item.budget_code_id,
        budgetLine: item.budget_line || undefined,
        description: item.description,
        vendorId: item.vendor_id,
        vendor: item.vendor || undefined,
        contractId: item.contract_id,
        quantity: item.quantity,
        unitOfMeasure: item.unit_of_measure,
        unitCost: item.unit_cost,
        extendedAmount: extendedAmount,
        costRom: item.cost_rom,
        revenueRom: item.revenue_rom,
        nonCommittedCost: item.non_committed_cost,
        sortOrder: item.sort_order || 0,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        _links: {
          self: `/api/projects/${projectId}/change-events/${changeEventId}/line-items/${item.id}`,
        },
      };
    });

    return NextResponse.json({
      data: formattedItems,
      _links: {
        self: `/api/projects/${projectId}/change-events/${changeEventId}/line-items`,
        changeEvent: `/api/projects/${projectId}/change-events/${changeEventId}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/change-events/[changeEventId]/line-items
 * Creates a new line item for a change event
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId, changeEventId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate request body
    const validatedData = createLineItemSchema.parse(body);

    // Verify change event exists and is not closed
    const { data: changeEvent, error: eventError } = await supabase
      .from('change_events')
      .select('id, status')
      .eq('project_id', parseInt(projectId, 10))
      .eq('id', changeEventId)
      .is('deleted_at', null)
      .single();

    if (eventError || !changeEvent) {
      return NextResponse.json(
        { error: 'Change event not found' },
        { status: 404 }
      );
    }

    if (changeEvent.status === 'Closed' || changeEvent.status === 'Void') {
      return NextResponse.json(
        { error: `Cannot add line items to a ${changeEvent.status.toLowerCase()} change event` },
        { status: 409 }
      );
    }

    // If budgetCodeId provided, verify it exists and belongs to project
    if (validatedData.budgetCodeId) {
      const { data: budgetLine, error: budgetError } = await supabase
        .from('budget_lines')
        .select('id, project_id')
        .eq('id', validatedData.budgetCodeId)
        .single();

      if (budgetError || !budgetLine) {
        return NextResponse.json(
          { error: 'Budget code not found' },
          { status: 404 }
        );
      }

      if (budgetLine.project_id !== parseInt(projectId, 10)) {
        return NextResponse.json(
          { error: 'Budget code does not belong to this project' },
          { status: 400 }
        );
      }
    }

    // If vendorId provided, verify it exists
    if (validatedData.vendorId) {
      const { data: vendor, error: vendorError } = await supabase
        .from('companies')
        .select('id')
        .eq('id', validatedData.vendorId)
        .single();

      if (vendorError || !vendor) {
        return NextResponse.json(
          { error: 'Vendor not found' },
          { status: 404 }
        );
      }
    }

    // Calculate extended amount for cost_rom if not provided
    const quantity = validatedData.quantity || 0;
    const unitCost = validatedData.unitCost || 0;
    const extendedAmount = quantity * unitCost;

    // Create the line item
    const { data, error } = await supabase
      .from('change_event_line_items')
      .insert({
        change_event_id: changeEventId,
        budget_code_id: validatedData.budgetCodeId || undefined,
        description: validatedData.description,
        vendor_id: validatedData.vendorId || undefined,
        contract_id: validatedData.contractId ? parseInt(validatedData.contractId, 10) : undefined,
        quantity: validatedData.quantity || undefined,
        unit_of_measure: validatedData.unitOfMeasure || undefined,
        unit_cost: validatedData.unitCost || undefined,
        cost_rom: validatedData.costRom !== undefined ? validatedData.costRom : extendedAmount,
        revenue_rom: validatedData.revenueRom || undefined,
        non_committed_cost: validatedData.nonCommittedCost || undefined,
        sort_order: validatedData.sortOrder,
      })
      .select(`
        *,
        budget_line:budget_lines!budget_code_id(
          id,
          description,
          cost_code:cost_codes!cost_code_id(
            id,
            title,
            division_id,
            division_title
          )
        ),
        vendor:companies!vendor_id(
          id,
          name
        )
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create line item', details: error.message },
        { status: 400 }
      );
    }

    // Update change event modification timestamp
    await supabase
      .from('change_events')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', changeEventId);

    // Format response
    const response = {
      id: data.id,
      changeEventId: data.change_event_id,
      budgetCodeId: data.budget_code_id,
      budgetLine: data.budget_line || undefined,
      description: data.description,
      vendorId: data.vendor_id,
      vendor: data.vendor || undefined,
      contractId: data.contract_id,
      quantity: data.quantity,
      unitOfMeasure: data.unit_of_measure,
      unitCost: data.unit_cost,
      extendedAmount: extendedAmount,
      costRom: data.cost_rom,
      revenueRom: data.revenue_rom,
      nonCommittedCost: data.non_committed_cost,
      sortOrder: data.sort_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      _links: {
        self: `/api/projects/${projectId}/change-events/${changeEventId}/line-items/${data.id}`,
        changeEvent: `/api/projects/${projectId}/change-events/${changeEventId}`,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/change-events/[changeEventId]/line-items
 * Bulk update line items (for reordering)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId, changeEventId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify change event exists
    const { data: changeEvent, error: eventError } = await supabase
      .from('change_events')
      .select('id, status')
      .eq('project_id', parseInt(projectId, 10))
      .eq('id', changeEventId)
      .is('deleted_at', null)
      .single();

    if (eventError || !changeEvent) {
      return NextResponse.json(
        { error: 'Change event not found' },
        { status: 404 }
      );
    }

    if (changeEvent.status === 'Closed' || changeEvent.status === 'Void') {
      return NextResponse.json(
        { error: `Cannot update line items in a ${changeEvent.status.toLowerCase()} change event` },
        { status: 409 }
      );
    }

    // Expect array of { id, sortOrder }
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be an array of line item updates' },
        { status: 400 }
      );
    }

    // Update sort orders
    const updates = body.map(item =>
      supabase
        .from('change_event_line_items')
        .update({ sort_order: item.sortOrder })
        .eq('id', item.id)
        .eq('change_event_id', changeEventId)
    );

    await Promise.all(updates);

    // Update change event modification timestamp
    await supabase
      .from('change_events')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', changeEventId);

    return NextResponse.json({ message: 'Line items reordered successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
