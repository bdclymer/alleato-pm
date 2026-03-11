"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  CreatePurchaseOrderForm,
  CreateSubcontractForm,
} from "@/components/domain/contracts";
import { ProjectFormPageLayout } from "@/components/layout";
import type { CreatePurchaseOrderInput } from "@/lib/schemas/create-purchase-order-schema";
import type { CreateSubcontractInput } from "@/lib/schemas/create-subcontract-schema";

export default function NewCommitmentPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = Number(params.projectId);
  const type = searchParams.get("type") || "subcontract"; // 'subcontract' or 'purchase_order'

  const parseApiError = async (response: Response) => {
    try {
      const json = await response.json();
      return {
        error:
          typeof json?.error === "string"
            ? json.error
            : `Request failed with status ${response.status}`,
        details: json?.details,
      };
    } catch {
      const text = await response.text();
      return {
        error:
          text?.trim() || `Request failed with status ${response.status}`,
        details: undefined,
      };
    }
  };

  const handleSubmitSubcontract = async (data: CreateSubcontractInput) => {
    console.warn(
      "[New Commitment Page] Starting subcontract submission for project:",
      projectId,
    );
    console.warn(
      "[New Commitment Page] Payload:",
      JSON.stringify(data, null, 2),
    );

    const response = await fetch(`/api/projects/${projectId}/subcontracts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const responseData = await parseApiError(response);
      // Create a detailed error with response info
      const errorMessage = responseData.error || "Failed to create subcontract";
      const detailedError = new Error(errorMessage) as Error & {
        details?: unknown;
        status?: number;
      };
      detailedError.details = responseData.details;
      detailedError.status = response.status;
      console.error("[New Commitment Page] Submission failed:", {
        status: response.status,
        error: errorMessage,
        details: responseData.details,
      });
      throw detailedError;
    }

    const responseData = await response.json();
    console.warn("[New Commitment Page] Response status:", response.status);
    console.warn(
      "[New Commitment Page] Subcontract created successfully:",
      responseData.data,
    );

    // Navigate back to commitments page
    router.push(`/${projectId}/commitments`);
  };

  const handleSubmitPurchaseOrder = async (data: CreatePurchaseOrderInput) => {
    console.warn(
      "[New Commitment Page] Starting purchase order submission for project:",
      projectId,
    );
    console.warn(
      "[New Commitment Page] Payload:",
      JSON.stringify(data, null, 2),
    );

    const response = await fetch(`/api/projects/${projectId}/purchase-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const responseData = await parseApiError(response);
      const errorMessage =
        responseData.error || "Failed to create purchase order";
      const detailedError = new Error(errorMessage) as Error & {
        details?: unknown;
        status?: number;
      };
      detailedError.details = responseData.details;
      detailedError.status = response.status;
      console.error("[New Commitment Page] Submission failed:", {
        status: response.status,
        error: errorMessage,
        details: responseData.details,
      });
      throw detailedError;
    }

    const responseData = await response.json();
    console.warn("[New Commitment Page] Response status:", response.status);
    console.warn(
      "[New Commitment Page] Purchase order created successfully:",
      responseData.data,
    );
    router.push(`/${projectId}/commitments`);
  };

  const handleCancel = () => {
    router.push(`/${projectId}/commitments`);
  };

  const title =
    type === "subcontract"
      ? "New Subcontract"
      : type === "purchase_order"
        ? "New Purchase Order"
        : "New Commitment";

  return (
    <ProjectFormPageLayout
      title={title}
      description={
        type === "subcontract"
          ? "Create a new subcontract commitment"
          : "Create a new purchase order commitment"
      }
      onBack={() => router.back()}
      backLabel="Back"
      maxWidth="xl"
    >
      {type === "purchase_order" ? (
        <CreatePurchaseOrderForm
          projectId={projectId}
          onSubmit={handleSubmitPurchaseOrder}
          onCancel={handleCancel}
        />
      ) : (
        <CreateSubcontractForm
          projectId={projectId}
          onSubmit={handleSubmitSubcontract}
          onCancel={handleCancel}
        />
      )}
    </ProjectFormPageLayout>
  );
}
