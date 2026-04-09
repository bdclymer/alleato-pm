/**
 * Table Configurations
 *
 * This module exports all table page configurations.
 * Each config file contains columns, filters, summary cards, and tabs for a specific table page.
 */

// Commitments table configuration
export {
  getCommitmentsColumns,
  commitmentsFilterOptions,
  getCommitmentsSummaryCards,
  getCommitmentsTabs,
  commitmentsMobileColumns,
  getCommitmentsStatusCounts,
  formatCurrency,
} from "./commitments.config";
export type { CommitmentStatusCounts } from "./commitments.config";


// Direct Costs table configuration
export {
  getDirectCostsColumns,
  directCostFilterOptions,
  directCostStatusOptions,
  directCostTypeOptions,
  getDirectCostsSummaryCards,
  directCostsMobileColumns,
  formatCostType,
} from "./direct-costs.config";
export type { DirectCost } from "./direct-costs.config";
