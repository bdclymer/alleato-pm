"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  FileText,
  Layers,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
// Commitment is from the commitments_unified view (combines subcontracts + purchase_orders)
interface Commitment {
  id: string;
  project_id: number;
  number: string;
  contract_company_id: string | null;
  title: string | null;
  status: string;
  executed: boolean;
  type: "subcontract" | "purchase_order";
  contract_amount?: number;
  vendor_id?: string;
  executed_at?: string;
  retention_percentage: number | null;
  start_date: string | null;
  executed_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  original_amount?: number;
}
type Contract = Database["public"]["Tables"]["financial_contracts"]["Row"];

interface FinancialTogglesProps {
  project: Project;
  commitments?: Commitment[];
  contracts?: Contract[];
}

interface ToggleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ToggleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: ToggleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        className="w-full justify-between p-4 hover:bg-muted"
      >
        <div className="flex items-center gap-4">
          {icon}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronDown />
        ) : (
          <ChevronRight />
        )}
      </Button>

      {isOpen && <div className="border-t px-4 pb-4">{children}</div>}
    </Card>
  );
}

export function FinancialToggles({
  project,
  commitments = [],
  contracts = [],
}: FinancialTogglesProps) {
  // Calculate budget data
  const totalBudget = project.budget || 0;
  const budgetUsed = project.budget_used || 0;
  const budgetRemaining = totalBudget - budgetUsed;
  const budgetPercentage =
    totalBudget > 0 ? (budgetUsed / totalBudget) * 100 : 0;

  // Calculate prime contract total
  const primeContractTotal = contracts
    .filter((c) => c.contract_type === "prime")
    .reduce((sum, contract) => sum + (contract.contract_amount || 0), 0);

  // Calculate commitments total (using contract_amount field)
  const commitmentsTotal = commitments.reduce(
    (sum, commitment) => sum + (commitment.contract_amount || 0),
    0,
  );
  const commitmentsApproved = commitments
    .filter((c) => c.status === "executed" || c.executed_at)
    .reduce((sum, commitment) => sum + (commitment.contract_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Budget Toggle */}
      <ToggleSection
        title="Budget"
        icon={<DollarSign className="h-5 w-5 text-success" />}
        defaultOpen={true}
      >
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="text-xl font-semibold">
                ${(totalBudget / 1000000).toFixed(2)}M
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Budget Used</p>
              <p className="text-xl font-semibold">
                ${(budgetUsed / 1000000).toFixed(2)}M
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-xl font-semibold text-success">
                ${(budgetRemaining / 1000000).toFixed(2)}M
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">% Complete</p>
              <p className="text-xl font-semibold">
                {budgetPercentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-success h-2 rounded-full transition-all"
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Budget Actions */}
          <div className="flex items-center justify-between pt-2">
            <a
              href={`/${project.id}/budget`}
              className="text-sm text-link hover:text-link-hover hover:underline"
            >
              View Budget Details →
            </a>
            <Button asChild size="sm" className="flex items-center gap-1">
              <a href={`/${project.id}/budget/new`}>
                <Plus />
                Create Budget
              </a>
            </Button>
          </div>
        </div>
      </ToggleSection>

      {/* Prime Contract Toggle */}
      <ToggleSection
        title="Prime Contract"
        icon={<FileText className="h-5 w-5 text-info" />}
      >
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Contract Value</p>
              <p className="text-xl font-semibold">
                ${(primeContractTotal / 1000000).toFixed(2)}M
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue Recognized</p>
              <p className="text-xl font-semibold">
                ${((project["est revenue"] || 0) / 1000000).toFixed(2)}M
              </p>
            </div>
          </div>

          {contracts.filter((c) => c.contract_type === "prime").length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Active Contracts:</p>
              {contracts
                .filter((c) => c.contract_type === "prime")
                .map((contract) => (
                  <div
                    key={contract.id}
                    className="flex justify-between items-center py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {contract.contract_number ||
                          `PC-${contract.id.substring(0, 8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {contract.title || "Primary Client"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      ${((contract.contract_amount || 0) / 1000000).toFixed(2)}M
                    </p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No prime contracts recorded</p>
          )}

          <div className="flex items-center justify-between pt-2">
            <a
              href={`/${project.id}/contracts`}
              className="text-sm text-link hover:text-link-hover hover:underline"
            >
              Manage Prime Contracts →
            </a>
            <Button asChild size="sm" className="flex items-center gap-1">
              <a href={`/${project.id}/contracts/new`}>
                <Plus />
                Create Contract
              </a>
            </Button>
          </div>
        </div>
      </ToggleSection>

      {/* Commitments Toggle */}
      <ToggleSection
        title="Commitments"
        icon={<Layers className="h-5 w-5 text-warning" />}
      >
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Committed</p>
              <p className="text-xl font-semibold">
                ${(commitmentsTotal / 1000000).toFixed(2)}M
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-xl font-semibold text-success">
                ${(commitmentsApproved / 1000000).toFixed(2)}M
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Count</p>
              <p className="text-xl font-semibold">{commitments.length}</p>
            </div>
          </div>

          {commitments.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Recent Commitments:</p>
              {commitments.slice(0, 3).map((commitment) => (
                <div
                  key={commitment.id}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      C-{commitment.id.substring(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {commitment.vendor_id
                        ? `Vendor ${commitment.vendor_id.substring(0, 8)}`
                        : "No vendor"}{" "}
                      • {commitment.status || "Draft"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    ${((commitment.contract_amount || 0) / 1000000).toFixed(2)}M
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No commitments recorded</p>
          )}

          <div className="flex items-center justify-between pt-2">
            <a
              href={`/${project.id}/commitments`}
              className="text-sm text-link hover:text-link-hover hover:underline"
            >
              View All Commitments →
            </a>
            <Button asChild size="sm" className="flex items-center gap-1">
              <a href={`/${project.id}/commitments/new`}>
                <Plus />
                Create Commitment
              </a>
            </Button>
          </div>
        </div>
      </ToggleSection>
    </div>
  );
}
