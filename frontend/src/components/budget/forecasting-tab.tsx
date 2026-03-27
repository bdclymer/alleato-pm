"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, TrendingUp, Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ForecastingTabProps {
  projectId: string;
}

interface ForecastData {
  summary: {
    totalOriginalBudget: number;
    totalRevisedBudget: number;
    totalProjectedBudget: number;
    totalProjectedCosts: number;
    totalProjectedVariance: number;
    variancePercentage: number;
  };
  forecastByCostCode: Array<{
    costCode: string;
    costCodeName: string;
    projectedBudget: number;
    projectedCosts: number;
    projectedVariance: number;
  }>;
  generatedAt: string;
}

export function ForecastingTab({ projectId }: ForecastingTabProps) {
  const [loading, setLoading] = React.useState(true);
  const [forecast, setForecast] = React.useState<ForecastData | null>(null);

  const fetchForecast = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/budget/forecast`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch forecast");
      }

      const data = await response.json();
      setForecast(data);
    } catch (error) {
      toast.error("Failed to load budget forecast");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return "text-success";
    if (variance < 0) return "text-destructive";
    return "text-foreground";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Budget Forecasting
          </h2>
          <p className="text-muted-foreground">
            Predict future budget performance and identify potential overruns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchForecast}>
            <Calculator />
            Recalculate Forecast
          </Button>
          <Button
            onClick={() => toast.info("Export functionality coming soon")}
          >
            <FileSpreadsheet />
            Export Forecast
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Projected Budget
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(forecast?.summary.totalProjectedBudget || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revised + Pending Changes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Projected Costs
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(forecast?.summary.totalProjectedCosts || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Direct + Committed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Projected Variance
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getVarianceColor(forecast?.summary.totalProjectedVariance || 0)}`}
            >
              {formatCurrency(forecast?.summary.totalProjectedVariance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {forecast?.summary.variancePercentage.toFixed(1)}% variance
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forecast by Cost Code</CardTitle>
          <CardDescription>
            Projected variance for each cost code
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!forecast || forecast.forecastByCostCode.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">No Forecast Data</p>
                <p className="text-sm">
                  Add budget lines to generate forecasts
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {forecast.forecastByCostCode.slice(0, 10).map((item) => (
                <div
                  key={item.costCode}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.costCode}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.costCodeName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-bold ${getVarianceColor(item.projectedVariance)}`}
                    >
                      {formatCurrency(item.projectedVariance)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(item.projectedBudget)} budget
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>
          <strong>Note:</strong> Forecasting uses historical data and current
          trends to predict future budget performance. Forecasts are updated
          automatically when budget data changes.
        </p>
      </div>
    </div>
  );
}
