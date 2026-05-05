export const dynamic = "force-dynamic";

import { PageShell } from "@/components/layout";
import { ProductBoardClient } from "@/features/product-board/product-board-client";
import { AddBoardItemButton } from "@/features/product-board/add-board-item-dialog";

export default function ProductBoardPage() {
  return (
    <PageShell
      variant="dashboard"
      title="Product Board"
      actions={<AddBoardItemButton />}
    >
      <div className="mt-6">
        <p className="mb-6 text-sm text-muted-foreground">
          Feature requests and ideas — drag cards to update status, click to open details.
        </p>
        <ProductBoardClient />
      </div>
    </PageShell>
  );
}
