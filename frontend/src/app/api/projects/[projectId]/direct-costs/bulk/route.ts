/**
 * =============================================================================
 * DIRECT COSTS BULK OPERATIONS API ENDPOINTS
 * =============================================================================
 *
 * RESTful API endpoints for bulk operations on Direct Costs
 * Supports:
 * - Bulk status updates (approve/reject/change status)
 * - Bulk delete (soft delete)
 * - Detailed success/failure reporting for each item
 */

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  DirectCostBulkStatusUpdateSchema,
  DirectCostBulkDeleteSchema,
} from '@/lib/schemas/direct-costs';
import { DirectCostService } from '@/lib/services/direct-cost-service';
import { requirePermission } from "@/lib/permissions-guard";

// =============================================================================
// POST - Perform Bulk Operations
// =============================================================================

export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/direct-costs/bulk#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const guard = await requirePermission(projectIdNum, "budget", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    const body = await request.json();

    // Determine operation type from request body
    const operationType = body.operation as 'status-update' | 'delete' | undefined;

    if (!operationType) {
      return NextResponse.json(
        { error: 'Operation type is required (status-update or delete)' },
        { status: 400 }
      );
    }

    const service = new DirectCostService(supabase);

    // =============================================================================
    // BULK STATUS UPDATE
    // =============================================================================

    if (operationType === 'status-update') {
      // Validate request data
      const validation = DirectCostBulkStatusUpdateSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid bulk status update data',
            details: validation.error.format(),
          },
          { status: 400 }
        );
      }

      const { ids, status, reason } = validation.data;

      // Perform bulk status update
      const result = await service.bulkStatusUpdate(projectId, ids, status, reason);

      return NextResponse.json(
        {
          operation: 'status-update',
          total: ids.length,
          success_count: result.success.length,
          failed_count: result.failed.length,
          success: result.success,
          failed: result.failed,
          status_applied: status,
        },
        { status: result.failed.length > 0 ? 207 : 200 } // 207 Multi-Status if partial success
      );
    }

    // =============================================================================
    // BULK DELETE
    // =============================================================================

    if (operationType === 'delete') {
      // Validate request data
      const validation = DirectCostBulkDeleteSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid bulk delete data',
            details: validation.error.format(),
          },
          { status: 400 }
        );
      }

      const { ids, reason } = validation.data;

      // Perform bulk delete
      const result = await service.bulkDelete(projectId, ids, reason);

      return NextResponse.json(
        {
          operation: 'delete',
          total: ids.length,
          success_count: result.success.length,
          failed_count: result.failed.length,
          success: result.success,
          failed: result.failed,
        },
        { status: result.failed.length > 0 ? 207 : 200 } // 207 Multi-Status if partial success
      );
    }

    // Unknown operation type
    return NextResponse.json(
      { error: `Unknown operation type: ${operationType}` },
      { status: 400 }
    );
    },
);
