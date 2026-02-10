import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createLineItemSchema } from '../../../contracts/[contractId]/change-orders/validation';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{
    projectId: string;
    changeOrderId: string;
  }>;
}

/**
 * GET /api/projects/[projectId]/change-orders/[changeOrderId]/line-items
 * Returns all line items for a change order
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId, changeOrderId } = await params;
    const supabase = await createClient();

    // Verify change order exists and belongs to project
    const { data: changeOrder, error: coError } = await supabase
      .from('change_orders')
      .select('id, project_id')
      .eq('id', parseInt(changeOrderId, 10))
      .single();

    if (coError || !changeOrder) {
      return NextResponse.json(
        { error: 'Change order not found' },
        { status: 404 }
      );
    }

    if (changeOrder.project_id !== parseInt(projectId, 10)) {
      return NextResponse.json(
        { error: 'Change order does not belong to this project' },
        { status: 403 }
      );
    }

    // Get line items with related data
    const { data: lineItems, error } = await supabase
      .from('change_order_lines')
      .select(`
        *,
        cost_code:cost_codes!cost_code_id(
          id,
          title,
          full_code,
          division_id,
          division_title
        ),
        cost_type:cost_types!cost_type_id(
          id,
          name
        ),
        sub_job:sub_jobs!sub_job_id(
          id,
          name
        )
      `)
      .eq('change_order_id', parseInt(changeOrderId, 10))
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch line items', details: error.message },
        { status: 400 }
      );
    }

    // Format response
    const formattedItems = (lineItems || []).map(item => ({
      id: item.id,
      changeOrderId: item.change_order_id,
      projectId: item.project_id,
      costCodeId: item.cost_code_id,
      costCode: item.cost_code || undefined,
      costTypeId: item.cost_type_id,
      costType: item.cost_type || undefined,
      description: item.description,
      amount: item.amount,
      subJobId: item.sub_job_id,
      subJob: item.sub_job || undefined,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      _links: {
        self: `/api/projects/${projectId}/change-orders/${changeOrderId}/line-items/${item.id}`,
      },
    }));

    return NextResponse.json({
      data: formattedItems,
      _links: {
        self: `/api/projects/${projectId}/change-orders/${changeOrderId}/line-items`,
        changeOrder: `/api/projects/${projectId}/change-orders/${changeOrderId}`,
      },
    });
  } catch (error) {
    console.error('Error fetching line items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/change-orders/[changeOrderId]/line-items
 * Creates a new line item for a change order
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId, changeOrderId } = await params;
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

    // Verify change order exists and belongs to project
    const { data: changeOrder, error: coError } = await supabase
      .from('change_orders')
      .select('id, project_id, status')
      .eq('id', parseInt(changeOrderId, 10))
      .single();

    if (coError || !changeOrder) {
      return NextResponse.json(
        { error: 'Change order not found' },
        { status: 404 }
      );
    }

    if (changeOrder.project_id !== parseInt(projectId, 10)) {
      return NextResponse.json(
        { error: 'Change order does not belong to this project' },
        { status: 403 }
      );
    }

    // Verify cost code exists
    const { data: costCode, error: costCodeError } = await supabase
      .from('cost_codes')
      .select('id')
      .eq('id', validatedData.cost_code_id)
      .single();

    if (costCodeError || !costCode) {
      return NextResponse.json(
        { error: 'Cost code not found' },
        { status: 404 }
      );
    }

    // Verify cost type exists
    const { data: costType, error: costTypeError } = await supabase
      .from('cost_types')
      .select('id')
      .eq('id', validatedData.cost_type_id)
      .single();

    if (costTypeError || !costType) {
      return NextResponse.json(
        { error: 'Cost type not found' },
        { status: 404 }
      );
    }

    // If sub_job_id provided, verify it exists
    if (validatedData.sub_job_id) {
      const { data: subJob, error: subJobError } = await supabase
        .from('sub_jobs')
        .select('id')
        .eq('id', validatedData.sub_job_id)
        .single();

      if (subJobError || !subJob) {
        return NextResponse.json(
          { error: 'Sub job not found' },
          { status: 404 }
        );
      }
    }

    // Create the line item
    const { data, error } = await supabase
      .from('change_order_lines')
      .insert({
        change_order_id: parseInt(changeOrderId, 10),
        project_id: parseInt(projectId, 10),
        cost_code_id: validatedData.cost_code_id,
        cost_type_id: validatedData.cost_type_id,
        description: validatedData.description || null,
        amount: validatedData.amount,
        sub_job_id: validatedData.sub_job_id || null,
      })
      .select(`
        *,
        cost_code:cost_codes!cost_code_id(
          id,
          title,
          full_code,
          division_id,
          division_title
        ),
        cost_type:cost_types!cost_type_id(
          id,
          name
        ),
        sub_job:sub_jobs!sub_job_id(
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Error creating line item:', error);
      return NextResponse.json(
        { error: 'Failed to create line item', details: error.message },
        { status: 400 }
      );
    }

    // Recalculate change order total amount
    const { data: allLineItems } = await supabase
      .from('change_order_lines')
      .select('amount')
      .eq('change_order_id', parseInt(changeOrderId, 10));

    const totalAmount = (allLineItems || []).reduce((sum, item) => sum + (item.amount || 0), 0);

    // Update change order total
    await supabase
      .from('change_orders')
      .update({
        amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(changeOrderId, 10));

    // Format response
    const response = {
      id: data.id,
      changeOrderId: data.change_order_id,
      projectId: data.project_id,
      costCodeId: data.cost_code_id,
      costCode: data.cost_code || undefined,
      costTypeId: data.cost_type_id,
      costType: data.cost_type || undefined,
      description: data.description,
      amount: data.amount,
      subJobId: data.sub_job_id,
      subJob: data.sub_job || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      _links: {
        self: `/api/projects/${projectId}/change-orders/${changeOrderId}/line-items/${data.id}`,
        changeOrder: `/api/projects/${projectId}/change-orders/${changeOrderId}`,
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

    console.error('Error in POST line items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
