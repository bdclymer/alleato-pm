export const dynamic = "force-dynamic";

import { PageShell } from "@/components/layout";
import { ProductBoardClient } from "@/features/product-board/product-board-client";

export default function ProductBoardPage() {
  return (
    <PageShell
      variant="dashboard"
      title="Product Board"
      contentClassName="space-y-6 pt-4"
    >
      <div className="min-w-0">
        <ProductBoardClient />
      </div>
    </PageShell>
  );
}
