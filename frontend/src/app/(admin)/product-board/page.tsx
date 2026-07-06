export const dynamic = "force-dynamic";

import { PageShell } from "@/components/layout";
import { ProductBoardClient } from "@/features/product-board/product-board-client";

export default function ProductBoardPage() {
  return (
    <PageShell
      variant="dashboard"
      title="Roadmap"
      contentClassName="space-y-6 pt-4"
      containerPaddingClassName="px-4 sm:pl-6 sm:pr-0 lg:pl-8 lg:pr-0 pt-2 pb-4"
    >
      <div className="min-w-0">
        <ProductBoardClient />
      </div>
    </PageShell>
  );
}
