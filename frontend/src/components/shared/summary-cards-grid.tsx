import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface SummaryCard {
  label: string;
  value: string | number;
  format?: "currency" | "number" | "percent";
  color?: "default" | "green" | "yellow" | "orange" | "red";
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface SummaryCardsGridProps {
  cards: SummaryCard[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function SummaryCardsGrid({
  cards,
  columns = 4,
  className,
}: SummaryCardsGridProps) {
  const formatValue = (card: SummaryCard): string => {
    if (typeof card.value === "string") return card.value;

    switch (card.format) {
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(card.value);

      case "percent":
        return `${card.value}%`;

      case "number":
      default:
        return new Intl.NumberFormat("en-US").format(card.value);
    }
  };

  const getColorClasses = (color?: string) => {
    switch (color) {
      case "green":
        return "text-success";
      case "yellow":
        return "text-warning";
      case "orange":
        return "text-warning";
      case "red":
        return "text-destructive";
      default:
        return "";
    }
  };

  const gridCols = {
    2: "md:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {cards.map((card, index) => (
        <Card key={index}>
          <CardContent className="flex items-start justify-between p-6">
            <div className="space-y-1">
              <p
                className={cn(
                  "text-2xl font-bold",
                  getColorClasses(card.color),
                )}
              >
                {formatValue(card)}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {card.label}
              </p>
              {card.trend && (
                <p
                  className={cn(
                    "text-xs",
                    card.trend.isPositive ? "text-success" : "text-destructive",
                  )}
                >
                  {card.trend.isPositive ? "↑" : "↓"}{" "}
                  {Math.abs(card.trend.value)}%
                </p>
              )}
            </div>
            {card.icon && (
              <card.icon
                className={cn(
                  "h-5 w-5",
                  getColorClasses(card.color) || "text-muted-foreground",
                )}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
