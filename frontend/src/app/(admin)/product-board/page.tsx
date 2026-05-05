export const dynamic = "force-dynamic";

import { PageShell } from "@/components/layout";
import { ProductBoardClient } from "@/features/product-board/product-board-client";

export default function ProductBoardPage() {
  return (
    <PageShell variant="content" title="Product Board">
      <div className="mt-6">
        <p className="mb-6 text-sm text-muted-foreground">
          Feature requests from the team — drag cards across columns to update their status.
        </p>
        <ProductBoardClient />
      </div>
    </PageShell>
  );
}
