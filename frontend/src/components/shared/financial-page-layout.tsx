"use client";

import React, { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
import { SummaryCardsGrid, SummaryCard } from "./summary-cards-grid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FinancialPageLayoutProps {
  title: string;
  description: string;
  createButtonLabel: string;
  onCreateClick?: () => void;
  createHref?: string;
  summaryCards: SummaryCard[];
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode;
}

export function FinancialPageLayout({
  title,
  description,
  createButtonLabel,
  onCreateClick,
  createHref,
  summaryCards,
  children,
  className,
  headerActions,
}: FinancialPageLayoutProps) {
  const router = useRouter();

  const handleCreateClick = () => {
    if (onCreateClick) {
      onCreateClick();
    } else if (createHref) {
      router.push(createHref);
    }
  };

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex items-center gap-4">
            {headerActions}
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleCreateClick}
            >
              {createButtonLabel}
            </Button>
          </div>
        }
      />

      <PageContainer className={cn("space-y-6", className)}>
        {/* Summary Cards */}
        <SummaryCardsGrid cards={summaryCards} />

        {/* Main Content */}
        <Card className="p-6">{children}</Card>
      </PageContainer>
    </>
  );
}
