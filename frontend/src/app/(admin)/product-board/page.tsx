export const dynamic = "force-dynamic";

import { PageShell } from "@/components/layout";
import { ProductBoardClient } from "@/features/product-board/product-board-client";

export default function ProductBoardPage() {
  return (
    <PageShell variant="dashboard" title="Product Board">
      <div className="mt-4">
        <ProductBoardClient />
      </div>
    </PageShell>
  );
}
