import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { updateLineItemSchema } from '../../../../contracts/[contractId]/change-orders/validation';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{
    projectId: string;
    changeOrderId: string;
    lineItemId: string;
  }>;
}

/**
 * PUT /api/projects/[projectId]/change-orders/[changeOrderId]/line-items/[lineItemId]
 * Updates a line item
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId, changeOrderId, lineItemId } = await params;
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
    const validatedData = updateLineItemSchema.parse(body);

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

    // Verify line item exists
    const { data: existingItem, error: fetchError } = await supabase
      .from('change_order_lines')
      .select('*')
      .eq('id', lineItemId)
      .eq('change_order_id', parseInt(changeOrderId, 10))
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { error: 'Line item not found' },
        { status: 404 }
      );
    }

    // Verify cost code if provided
    if (validatedData.cost_code_id) {
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
    }

    // Verify cost type if provided
    if (validatedData.cost_type_id) {
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
    }

    // Verify sub job if provided
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

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.cost_code_id !== undefined) updates.cost_code_id = validatedData.cost_code_id;
    if (validatedData.cost_type_id !== undefined) updates.cost_type_id = validatedData.cost_type_id;
    if (validatedData.description !== undefined) updates.description = validatedData.description;
    if (validatedData.amount !== undefined) updates.amount = validatedData.amount;
    if (validatedData.sub_job_id !== undefined) updates.sub_job_id = validatedData.sub_job_id;

    // Update the line item
    const { data, error } = await supabase
      .from('change_order_lines')
      .update(updates)
      .eq('id', lineItemId)
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
      console.error('Error updating line item:', error);
      return NextResponse.json(
        { error: 'Failed to update line item', details: error.message },
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
        self: `/api/projects/${projectId}/change-orders/${changeOrderId}/line-items/${lineItemId}`,
        changeOrder: `/api/projects/${projectId}/change-orders/${changeOrderId}`,
      },
    };

    return NextResponse.json(response);
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

    console.error('Error in PUT line item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/change-orders/[changeOrderId]/line-items/[lineItemId]
 * Deletes a line item
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId, changeOrderId, lineItemId } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    // Verify line item exists
    const { data: lineItem, error: fetchError } = await supabase
      .from('change_order_lines')
      .select('id')
      .eq('id', lineItemId)
      .eq('change_order_id', parseInt(changeOrderId, 10))
      .single();

    if (fetchError || !lineItem) {
      return NextResponse.json(
        { error: 'Line item not found' },
        { status: 404 }
      );
    }

    // Delete the line item
    const { error } = await supabase
      .from('change_order_lines')
      .delete()
      .eq('id', lineItemId);

    if (error) {
      console.error('Error deleting line item:', error);
      return NextResponse.json(
        { error: 'Failed to delete line item', details: error.message },
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

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE line item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
